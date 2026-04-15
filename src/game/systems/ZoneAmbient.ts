import { GameObjects, Scene, Math as PhaserMath } from 'phaser';

type Zone = 'atmosphere' | 'turbulence' | 'space';

interface AmbientElement {
    obj: GameObjects.GameObject;
    type: string;
    driftX?: number;
}

export class ZoneAmbient {
    private scene: Scene;
    private container: GameObjects.Container;
    private currentZone: Zone = 'atmosphere';
    private activeElements: AmbientElement[] = [];
    private fadingOutElements: AmbientElement[] = [];
    private spawnTimers: Record<string, number> = {};
    private readonly screenW = 720;
    private readonly screenH = 1280;

    constructor(scene: Scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0);
        this.container.setDepth(-10);
    }

    update(delta: number, altitude: number, cameraX: number, cameraY: number): void {
        const newZone = this.zoneFromAltitude(altitude);
        if (newZone !== this.currentZone) {
            this.transitionTo(newZone);
        }

        this.updateFadingOut();
        this.updateActive(delta, cameraX, cameraY);
    }

    destroy(): void {
        for (const e of [...this.activeElements, ...this.fadingOutElements]) {
            e.obj.destroy();
        }
        this.activeElements = [];
        this.fadingOutElements = [];
        this.container.destroy();
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

    private updateFadingOut(): void {
        // tweens destroy elements themselves; nothing needed here
    }

    private updateActive(delta: number, cameraX: number, cameraY: number): void {
        // Drift + cleanup
        for (let i = this.activeElements.length - 1; i >= 0; i--) {
            const e = this.activeElements[i];
            if (e.type === 'lightning' || e.type === 'star' || e.type === 'meteor' || e.type === 'planet') continue;
            if (e.driftX && e.obj instanceof GameObjects.Graphics) {
                e.obj.x += (e.driftX * delta) / 1000;
            }
            const obj = e.obj as unknown as { x?: number; y?: number };
            if (
                obj.x !== undefined && obj.y !== undefined &&
                (Math.abs(obj.x - cameraX - this.screenW / 2) > 1500 ||
                 Math.abs(obj.y - cameraY - this.screenH / 2) > 1500)
            ) {
                e.obj.destroy();
                this.activeElements.splice(i, 1);
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
        this.spawnTimers.cloud = (this.spawnTimers.cloud ?? 3000) + delta;
        if (clouds < 4 && this.spawnTimers.cloud >= PhaserMath.Between(2500, 4000)) {
            this.spawnTimers.cloud = 0;
            this.spawnCloud(cameraX, cameraY);
        }

        const birds = this.activeElements.filter(e => e.type === 'bird').length;
        this.spawnTimers.bird = (this.spawnTimers.bird ?? 0) + delta;
        if (birds < 1 && this.spawnTimers.bird >= PhaserMath.Between(8000, 12000)) {
            this.spawnTimers.bird = 0;
            this.spawnBird(cameraX, cameraY);
        }
    }

    private spawnCloud(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * (this.screenW / 2 + 100);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 200);

        const g = this.scene.add.graphics();
        g.fillStyle(0xffffff, 0.5);
        const w = PhaserMath.Between(120, 220);
        const h = PhaserMath.Between(40, 70);
        g.fillEllipse(0, 0, w, h);
        g.fillEllipse(-w * 0.3, -h * 0.2, w * 0.6, h * 0.7);
        g.fillEllipse(w * 0.3, -h * 0.15, w * 0.5, h * 0.6);
        g.setPosition(x, y);
        g.setScrollFactor(PhaserMath.FloatBetween(0.4, 0.7));
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({ targets: g, alpha: 0.5, duration: 600 });

        const drift = (side === -1 ? 1 : -1) * PhaserMath.FloatBetween(15, 30);
        this.activeElements.push({ obj: g, type: 'cloud', driftX: drift });
    }

    private spawnBird(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * (this.screenW / 2 + 80);
        const y = cameraY + PhaserMath.Between(150, 600);

        const g = this.scene.add.graphics();
        g.lineStyle(2, 0x222222, 0.7);
        g.beginPath();
        g.moveTo(-10, 0);
        g.lineTo(0, -5);
        g.lineTo(10, 0);
        g.strokePath();
        g.setPosition(x, y);
        g.setScrollFactor(0.5);
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({ targets: g, alpha: 0.7, duration: 600 });

        const drift = (side === -1 ? 1 : -1) * PhaserMath.FloatBetween(40, 70);
        this.activeElements.push({ obj: g, type: 'bird', driftX: drift });
    }

    private spawnStormCloud(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * (this.screenW / 2 + 100);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 200);

        const g = this.scene.add.graphics();
        g.fillStyle(0x2a2a3a, 0.75);
        const w = PhaserMath.Between(180, 280);
        const h = PhaserMath.Between(60, 90);
        g.fillEllipse(0, 0, w, h);
        g.fillEllipse(-w * 0.3, -h * 0.2, w * 0.6, h * 0.7);
        g.fillEllipse(w * 0.3, -h * 0.15, w * 0.5, h * 0.6);
        g.setPosition(x, y);
        g.setScrollFactor(0.5);
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({ targets: g, alpha: 0.75, duration: 600 });

        const drift = (side === -1 ? 1 : -1) * PhaserMath.FloatBetween(10, 20);
        this.activeElements.push({ obj: g, type: 'stormcloud', driftX: drift });
    }

    private spawnLightning(cameraX: number, cameraY: number): void {
        const x = cameraX + PhaserMath.Between(50, this.screenW - 50);
        const y = cameraY + PhaserMath.Between(100, 500);

        const g = this.scene.add.graphics();
        g.lineStyle(3, 0xffffff, 1);
        g.beginPath();
        g.moveTo(0, 0);
        let px = 0, py = 0;
        for (let i = 0; i < 5; i++) {
            px += PhaserMath.Between(-15, 15);
            py += PhaserMath.Between(20, 40);
            g.lineTo(px, py);
        }
        g.strokePath();
        g.setPosition(x, y);
        g.setScrollFactor(0.6);
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({
            targets: g, alpha: 1, duration: 80,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: g, alpha: 0, duration: 300,
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
        this.spawnTimers.stormcloud = (this.spawnTimers.stormcloud ?? 0) + delta;
        if (clouds < 3 && this.spawnTimers.stormcloud >= PhaserMath.Between(3000, 5000)) {
            this.spawnTimers.stormcloud = 0;
            this.spawnStormCloud(cameraX, cameraY);
        }

        this.spawnTimers.lightning = (this.spawnTimers.lightning ?? 0) + delta;
        if (this.spawnTimers.lightning >= PhaserMath.Between(4000, 7000)) {
            this.spawnTimers.lightning = 0;
            this.spawnLightning(cameraX, cameraY);
        }
    }

    private spawnSpaceStars(cameraX: number, cameraY: number): void {
        for (let i = 0; i < 50; i++) {
            const x = cameraX + PhaserMath.Between(-400, this.screenW + 400);
            const y = cameraY + PhaserMath.Between(-400, this.screenH + 400);
            const radius = PhaserMath.FloatBetween(0.8, 2);
            const color = Math.random() < 0.1 ? 0xffcc66 : 0xffffff;
            const alpha = PhaserMath.FloatBetween(0.4, 0.9);

            const s = this.scene.add.circle(x, y, radius, color, 0);
            s.setScrollFactor(0.1);
            this.container.add(s);

            this.scene.tweens.add({ targets: s, alpha, duration: 600 });
            this.activeElements.push({ obj: s, type: 'star' });
        }
    }

    private spawnMeteor(cameraX: number, cameraY: number): void {
        const x = cameraX + this.screenW + 80;
        const y = cameraY + PhaserMath.Between(-100, this.screenH * 0.6);

        const streak = this.scene.add.rectangle(x, y, 80, 3, 0xffaa66, 0);
        streak.setAngle(30);
        streak.setScrollFactor(0.3);
        this.container.add(streak);

        this.scene.tweens.add({ targets: streak, alpha: 1, duration: 200 });

        this.scene.tweens.add({
            targets: streak,
            x: x - 600,
            y: y + 400,
            duration: 1500,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: streak, alpha: 0, duration: 300,
                    onComplete: () => {
                        streak.destroy();
                        const idx = this.activeElements.findIndex(e => e.obj === streak);
                        if (idx >= 0) this.activeElements.splice(idx, 1);
                    },
                });
            },
        });

        this.activeElements.push({ obj: streak, type: 'meteor' });
    }

    private spawnPlanet(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * PhaserMath.Between(200, 350);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 300);

        const colors = [0x8866cc, 0x66aacc, 0xcc6688, 0xaacc66];
        const color = colors[PhaserMath.Between(0, colors.length - 1)];

        const g = this.scene.add.graphics();
        g.fillStyle(color, 1);
        const r = PhaserMath.Between(80, 140);
        g.fillCircle(0, 0, r);
        g.lineStyle(2, 0xffffff, 0.3);
        g.strokeCircle(0, 0, r);
        g.setPosition(x, y);
        g.setScrollFactor(0.15);
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({ targets: g, alpha: 0.4, duration: 800 });
        this.activeElements.push({ obj: g, type: 'planet' });
    }

    private updateSpace(delta: number, cameraX: number, cameraY: number): void {
        const stars = this.activeElements.filter(e => e.type === 'star').length;
        if (stars === 0) {
            this.spawnSpaceStars(cameraX, cameraY);
        }

        const meteors = this.activeElements.filter(e => e.type === 'meteor').length;
        this.spawnTimers.meteor = (this.spawnTimers.meteor ?? 0) + delta;
        if (meteors < 1 && this.spawnTimers.meteor >= PhaserMath.Between(6000, 10000)) {
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
