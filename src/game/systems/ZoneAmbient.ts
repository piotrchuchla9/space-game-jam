import { GameObjects, Scene, Math as PhaserMath } from 'phaser';

type Zone = 'atmosphere' | 'turbulence' | 'space';

interface AmbientElement {
    obj: GameObjects.GameObject;
    type: string;
    driftX?: number;
    fadingOut?: boolean;
}

export class ZoneAmbient {
    private scene: Scene;
    private currentZone: Zone = 'atmosphere';
    private activeElements: AmbientElement[] = [];
    private fadingOutElements: AmbientElement[] = [];
    private spawnTimers: Record<string, number> = {};
    private readonly screenW = 720;
    private readonly screenH = 1280;
    private readonly depthBg = -3;
    private readonly depthFx = -2;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    update(delta: number, altitude: number, cameraX: number, cameraY: number): void {
        const newZone = this.zoneFromAltitude(altitude);
        if (newZone !== this.currentZone) {
            this.transitionTo(newZone);
        }

        this.updateActive(delta, cameraX, cameraY);
    }

    destroy(): void {
        for (const e of [...this.activeElements, ...this.fadingOutElements]) {
            e.obj.destroy();
        }
        this.activeElements = [];
        this.fadingOutElements = [];
    }

    private zoneFromAltitude(altitude: number): Zone {
        if (altitude < 5000) return 'atmosphere';
        if (altitude < 15000) return 'turbulence';
        return 'space';
    }

    private transitionTo(newZone: Zone): void {
        for (const e of this.activeElements) {
            this.scene.tweens.add({
                targets: e.obj,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    e.obj.destroy();
                    const idx = this.fadingOutElements.indexOf(e);
                    if (idx >= 0) this.fadingOutElements.splice(idx, 1);
                },
            });
            this.fadingOutElements.push(e);
        }
        this.activeElements = [];
        this.spawnTimers = {};
        this.currentZone = newZone;
    }

    private updateActive(delta: number, cameraX: number, cameraY: number): void {
        for (const e of this.activeElements) {
            if (e.driftX) {
                const mover = e.obj as unknown as { x: number };
                mover.x += (e.driftX * delta) / 1000;
            }
        }

        if (this.currentZone === 'atmosphere') {
            this.updateAtmosphere(delta, cameraX, cameraY);
        } else if (this.currentZone === 'turbulence') {
            this.updateTurbulence(delta, cameraX, cameraY);
        } else if (this.currentZone === 'space') {
            this.updateSpace(delta, cameraX, cameraY);
        }
    }

    private updateAtmosphere(delta: number, cameraX: number, cameraY: number): void {
        const clouds = this.activeElements.filter(e => e.type === 'cloud').length;
        this.spawnTimers.cloud = (this.spawnTimers.cloud ?? 1500) + delta;
        if (clouds < 8 && this.spawnTimers.cloud >= PhaserMath.Between(1200, 2000)) {
            this.spawnTimers.cloud = 0;
            this.spawnCloud(cameraX, cameraY);
        }
    }

    private spawnCloud(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * (this.screenW / 2 + 40);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 200);

        const key = `cloud${PhaserMath.Between(1, 9)}`;
        const img = this.scene.add.image(x, y, key);
        const scale = PhaserMath.FloatBetween(0.5, 0.9);
        img.setScale(scale);
        img.setAlpha(0);
        img.setDepth(this.depthBg);
        if (Math.random() < 0.5) img.setFlipX(true);

        this.scene.tweens.add({ targets: img, alpha: 0.9, duration: 600 });

        const drift = (side === -1 ? 1 : -1) * PhaserMath.FloatBetween(15, 30);
        this.activeElements.push({ obj: img, type: 'cloud', driftX: drift });
    }

    private spawnStormCloud(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * (this.screenW / 2 + 40);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 200);

        const key = `cloud${PhaserMath.Between(1, 9)}`;
        const img = this.scene.add.image(x, y, key);
        const scale = PhaserMath.FloatBetween(0.7, 1.1);
        img.setScale(scale);
        img.setTint(0x3a3a55);
        img.setAlpha(0);
        img.setDepth(this.depthBg);
        if (Math.random() < 0.5) img.setFlipX(true);

        this.scene.tweens.add({ targets: img, alpha: 0.9, duration: 600 });

        const drift = (side === -1 ? 1 : -1) * PhaserMath.FloatBetween(10, 20);
        this.activeElements.push({ obj: img, type: 'stormcloud', driftX: drift });
    }

    private spawnLightning(cameraX: number, cameraY: number): void {
        const x = cameraX + PhaserMath.Between(50, this.screenW - 50);
        const y = cameraY + PhaserMath.Between(100, 500);

        const g = this.scene.add.graphics();
        g.lineStyle(4, 0xffffff, 1);
        g.beginPath();
        g.moveTo(0, 0);
        let px = 0, py = 0;
        for (let i = 0; i < 6; i++) {
            px += PhaserMath.Between(-20, 20);
            py += PhaserMath.Between(25, 45);
            g.lineTo(px, py);
        }
        g.strokePath();
        g.setPosition(x, y);
        g.setAlpha(0);
        g.setDepth(this.depthFx);

        this.scene.tweens.add({
            targets: g, alpha: 1, duration: 80,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: g, alpha: 0, duration: 350,
                    onComplete: () => {
                        g.destroy();
                        const idx = this.activeElements.findIndex(e => e.obj === g);
                        if (idx >= 0) this.activeElements.splice(idx, 1);
                    },
                });
            },
        });

        this.activeElements.push({ obj: g, type: 'lightning' });
    }

    private updateTurbulence(delta: number, cameraX: number, cameraY: number): void {
        const clouds = this.activeElements.filter(e => e.type === 'stormcloud').length;
        this.spawnTimers.stormcloud = (this.spawnTimers.stormcloud ?? 1500) + delta;
        if (clouds < 8 && this.spawnTimers.stormcloud >= PhaserMath.Between(1200, 2000)) {
            this.spawnTimers.stormcloud = 0;
            this.spawnStormCloud(cameraX, cameraY);
        }

        this.spawnTimers.lightning = (this.spawnTimers.lightning ?? 0) + delta;
        if (this.spawnTimers.lightning >= PhaserMath.Between(1500, 3000)) {
            this.spawnTimers.lightning = 0;
            this.spawnLightning(cameraX, cameraY);
        }
    }

    private spawnSpaceStars(cameraX: number, cameraY: number): void {
        for (let i = 0; i < 60; i++) {
            const x = cameraX + PhaserMath.Between(-200, this.screenW + 200);
            const y = cameraY + PhaserMath.Between(-200, this.screenH + 200);
            const radius = PhaserMath.FloatBetween(0.8, 2.2);
            const color = Math.random() < 0.15 ? 0xffcc66 : 0xffffff;
            const alpha = PhaserMath.FloatBetween(0.4, 0.95);

            const s = this.scene.add.circle(x, y, radius, color);
            s.setAlpha(0);
            s.setDepth(this.depthBg);

            this.scene.tweens.add({ targets: s, alpha, duration: 600 });
            this.activeElements.push({ obj: s, type: 'star' });
        }
    }

    private spawnMeteor(cameraX: number, cameraY: number): void {
        // side=1 → leci z prawej w lewo, side=-1 → z lewej w prawo
        const side = Math.random() < 0.5 ? 1 : -1;
        const startX = cameraX + (side === 1 ? this.screenW + 80 : -80);
        const startY = cameraY + PhaserMath.Between(-100, this.screenH * 0.6);

        const colors = [0x4ad8ff, 0xff5fa2, 0xffaa66, 0xffffff, 0xffee88, 0xb88cff];
        const color = colors[PhaserMath.Between(0, colors.length - 1)];
        const length = PhaserMath.Between(70, 120);
        const travel = PhaserMath.Between(600, 900);

        const dx = -side * travel;
        const dy = travel * 0.58;
        const angleRad = Math.atan2(dy, dx);

        const g = this.scene.add.graphics();
        // Smuga — cienka linia za czubkiem
        g.lineStyle(2.5, color, 0.85);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-length, 0);
        g.strokePath();
        // Druga, słabsza warstwa dla miękkiego świecenia ogona
        g.lineStyle(5, color, 0.25);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-length * 0.7, 0);
        g.strokePath();
        // Czubek — jasna kropka
        g.fillStyle(0xffffff, 1);
        g.fillCircle(0, 0, 3.5);
        g.fillStyle(color, 0.6);
        g.fillCircle(0, 0, 6);

        g.setPosition(startX, startY);
        g.setRotation(angleRad);
        g.setAlpha(0);
        g.setDepth(this.depthFx);

        this.scene.tweens.add({ targets: g, alpha: 1, duration: 150 });

        this.scene.tweens.add({
            targets: g,
            x: startX + dx,
            y: startY + dy,
            duration: PhaserMath.Between(900, 1400),
            onComplete: () => {
                this.scene.tweens.add({
                    targets: g, alpha: 0, duration: 250,
                    onComplete: () => {
                        g.destroy();
                        const idx = this.activeElements.findIndex(e => e.obj === g);
                        if (idx >= 0) this.activeElements.splice(idx, 1);
                    },
                });
            },
        });

        this.activeElements.push({ obj: g, type: 'meteor' });
    }

    private spawnPlanet(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * PhaserMath.Between(150, 300);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 300);

        const colors = [0x8866cc, 0x66aacc, 0xcc6688, 0xaacc66];
        const color = colors[PhaserMath.Between(0, colors.length - 1)];

        const g = this.scene.add.graphics();
        g.fillStyle(color, 1);
        const r = PhaserMath.Between(45, 75);
        g.fillCircle(0, 0, r);
        g.lineStyle(2, 0xffffff, 0.3);
        g.strokeCircle(0, 0, r);
        g.setPosition(x, y);
        g.setAlpha(0);
        g.setDepth(this.depthBg);

        this.scene.tweens.add({ targets: g, alpha: 0.45, duration: 800 });
        this.activeElements.push({ obj: g, type: 'planet' });
    }

    private updateSpace(delta: number, cameraX: number, cameraY: number): void {
        const stars = this.activeElements.filter(e => e.type === 'star').length;
        if (stars === 0) {
            this.spawnSpaceStars(cameraX, cameraY);
        }

        const meteors = this.activeElements.filter(e => e.type === 'meteor').length;
        this.spawnTimers.meteor = (this.spawnTimers.meteor ?? 0) + delta;
        if (meteors < 4 && this.spawnTimers.meteor >= PhaserMath.Between(800, 2000)) {
            this.spawnTimers.meteor = 0;
            this.spawnMeteor(cameraX, cameraY);
        }

        const planets = this.activeElements.filter(e => e.type === 'planet').length;
        this.spawnTimers.planet = (this.spawnTimers.planet ?? 0) + delta;
        if (planets < 1 && this.spawnTimers.planet >= 15000) {
            this.spawnTimers.planet = 0;
            this.spawnPlanet(cameraX, cameraY);
        }
    }
}
