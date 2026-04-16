import { GameObjects, Scene, Math as PhaserMath } from 'phaser';
import { Rocket } from '../objects/Rocket';
import { GameState } from '../GameState';

type Zone = 'atmosphere' | 'turbulence' | 'space';

interface AmbientElement {
    obj: GameObjects.GameObject;
    type: string;
    driftX?: number;
    fadingOut?: boolean;
    ring?: GameObjects.Graphics;
    glow?: GameObjects.Graphics;
    lifetime?: number;
    maxLifetime?: number;
    consumed?: boolean;
    forceSound?: Phaser.Sound.BaseSound;
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

    private plannedBlackHoles: { altitude: number; worldX: number }[] = [];
    private bhNextIndex: number = 0;

    constructor(scene: Scene) {
        this.scene = scene;
        this.plannedBlackHoles = this.generateBlackHoleMap();
    }

    private generateBlackHoleMap(): { altitude: number; worldX: number }[] {
        const holes: { altitude: number; worldX: number }[] = [];
        const worldLeft = -2600;
        const worldRight = 3560;
        const minAlt = 15500;
        const maxAlt = 50000;
        const count = 25;
        for (let i = 0; i < count; i++) {
            holes.push({
                altitude: minAlt + Math.random() * (maxAlt - minAlt),
                worldX: worldLeft + Math.random() * (worldRight - worldLeft),
            });
        }
        return holes.sort((a, b) => a.altitude - b.altitude);
    }

    update(delta: number, altitude: number, cameraX: number, cameraY: number, rocket?: Rocket | null): void {
        const newZone = this.zoneFromAltitude(altitude);
        if (newZone !== this.currentZone) {
            this.transitionTo(newZone);
        }

        this.updateActive(delta, altitude, cameraX, cameraY, rocket ?? null);
    }

    destroy(): void {
        for (const e of [...this.activeElements, ...this.fadingOutElements]) {
            if (e.forceSound) {
                if (e.forceSound.isPlaying) e.forceSound.stop();
                e.forceSound.destroy();
            }
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

    private updateActive(delta: number, altitude: number, cameraX: number, cameraY: number, rocket: Rocket | null): void {
        for (const e of this.activeElements) {
            if (e.driftX) {
                const mover = e.obj as unknown as { x: number };
                mover.x += (e.driftX * delta) / 1000;
            }
        }

        if (this.currentZone === 'atmosphere') {
            this.updateAtmosphere(delta, altitude, cameraX, cameraY);
        } else if (this.currentZone === 'turbulence') {
            this.updateTurbulence(delta, cameraX, cameraY);
        } else if (this.currentZone === 'space') {
            this.updateSpace(delta, altitude, cameraX, cameraY, rocket);
        }
    }

    private updateAtmosphere(delta: number, altitude: number, cameraX: number, cameraY: number): void {
        if (altitude < 400) return;
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

    private spawnSpaceStars(_cameraX: number, _cameraY: number): void {
        for (let i = 0; i < 60; i++) {
            const x = PhaserMath.Between(-50, this.screenW + 50);
            const y = PhaserMath.Between(-50, this.screenH + 50);
            const radius = PhaserMath.FloatBetween(0.8, 2.2);
            const color = Math.random() < 0.15 ? 0xffcc66 : 0xffffff;
            const alpha = PhaserMath.FloatBetween(0.4, 0.95);

            const s = this.scene.add.circle(x, y, radius, color);
            s.setScrollFactor(0);
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

        const idx = PhaserMath.Between(0, 9);
        const key = `planet${String(idx).padStart(2, '0')}`;
        const size = PhaserMath.Between(110, 180);

        const g = this.scene.add.image(x, y, key);
        g.setDisplaySize(size, size);
        g.setAlpha(0);
        g.setDepth(this.depthBg);

        this.scene.tweens.add({ targets: g, alpha: 0.4, duration: 800 });
        this.activeElements.push({ obj: g, type: 'planet' });
    }

    private cullOffscreenPlanets(cameraY: number): void {
        for (let i = this.activeElements.length - 1; i >= 0; i--) {
            const e = this.activeElements[i];
            if (e.type !== 'planet' || e.fadingOut) continue;
            const obj = e.obj as unknown as { y: number };
            if (obj.y > cameraY + this.screenH + 200 || obj.y < cameraY - 400) {
                e.fadingOut = true;
                this.scene.tweens.add({
                    targets: e.obj,
                    alpha: 0,
                    duration: 400,
                    onComplete: () => {
                        e.obj.destroy();
                        const idx = this.activeElements.indexOf(e);
                        if (idx >= 0) this.activeElements.splice(idx, 1);
                    },
                });
            }
        }
    }

    private updateSpace(delta: number, altitude: number, cameraX: number, cameraY: number, rocket: Rocket | null): void {
        this.cullOffscreenPlanets(cameraY);
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
        if (planets < 5 && this.spawnTimers.planet >= 1500) {
            this.spawnTimers.planet = 0;
            this.spawnPlanet(cameraX, cameraY);
        }

        // Lazy-spawn pre-planned black holes just ahead of the viewport (~800 altitude units = just above screen top)
        const bhAheadWindow = 800;
        while (this.bhNextIndex < this.plannedBlackHoles.length) {
            const bh = this.plannedBlackHoles[this.bhNextIndex];
            if (bh.altitude > altitude + bhAheadWindow) break;
            this.spawnBlackHoleAt(bh.worldX, 1100 - bh.altitude);
            this.bhNextIndex++;
        }

        this.updateBlackHoles(delta, cameraY, rocket);
    }

    private spawnBlackHoleAt(x: number, y: number): void {

        const container = this.scene.add.container(x, y);
        container.setDepth(this.depthFx);
        container.setAlpha(0);

        const glow = this.scene.add.graphics();
        glow.fillStyle(0x6a1b9a, 0.25);
        glow.fillCircle(0, 0, 90);
        glow.fillStyle(0x8a2be2, 0.15);
        glow.fillCircle(0, 0, 70);

        const ring = this.scene.add.graphics();
        ring.lineStyle(6, 0x8a2be2, 0.9);
        ring.strokeCircle(0, 0, 55);
        ring.lineStyle(3, 0xaa66ff, 0.5);
        ring.strokeCircle(0, 0, 70);
        // asymmetric accent for rotation visibility
        ring.lineStyle(4, 0xffffff, 0.35);
        ring.beginPath();
        ring.arc(0, 0, 55, -0.3, 0.3, false);
        ring.strokePath();

        const core = this.scene.add.graphics();
        core.fillStyle(0x000000, 1);
        core.fillCircle(0, 0, 35);
        core.fillStyle(0x1a0033, 0.9);
        core.fillCircle(0, 0, 30);

        container.add([glow, ring, core]);

        this.scene.tweens.add({ targets: container, alpha: 1, duration: 600 });
        this.scene.tweens.add({
            targets: glow,
            alpha: { from: 1, to: 0.45 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        this.scene.tweens.add({
            targets: container,
            scale: { from: 0.95, to: 1.05 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        const forceSound = this.scene.sound.add('blackHoleForce', { loop: true, volume: 0 });

        const el: AmbientElement = {
            obj: container,
            type: 'blackhole',
            ring,
            glow,
            lifetime: 0,
            maxLifetime: PhaserMath.Between(12000, 18000),
            forceSound,
        };
        this.activeElements.push(el);
    }

    private updateBlackHoles(delta: number, cameraY: number, rocket: Rocket | null): void {
        const radius = 320;
        const coreDist = 40;
        const baseForce = 0.012;

        for (let i = this.activeElements.length - 1; i >= 0; i--) {
            const e = this.activeElements[i];
            if (e.type !== 'blackhole' || e.consumed) continue;

            const container = e.obj as GameObjects.Container;
            if (e.ring) {
                e.ring.rotation += (0.4 * delta) / 1000;
            }

            e.lifetime = (e.lifetime ?? 0) + delta;

            // cull if offscreen or expired
            const offscreen = container.y > cameraY + this.screenH + 300 || container.y < cameraY - 500;
            const expired = (e.maxLifetime ?? 0) > 0 && (e.lifetime ?? 0) >= (e.maxLifetime ?? 0);
            if (offscreen || expired) {
                this.fadeOutBlackHole(e, offscreen ? 300 : 800);
                continue;
            }

            if (!rocket) continue;

            const dx = container.x - rocket.body.position.x;
            const dy = container.y - rocket.body.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < coreDist) {
                // consumed — halve fuel, slow, remove
                rocket.fuel = rocket.fuel * 0.5;
                rocket.activateSlowdown(2000);
                e.consumed = true;
                if (e.forceSound && e.forceSound.isPlaying) e.forceSound.stop();
                this.scene.sound.play('blackHoleHit', { volume: 0.7 * GameState.getSfxVolume() });
                this.fadeOutBlackHole(e, 400);
                continue;
            }

            if (dist < radius && dist > 0.1) {
                const falloff = 1 - dist / radius;
                const strength = baseForce * falloff * falloff * rocket.body.mass;
                const nx = dx / dist;
                const ny = dy / dist;
                // Apply pull at rocket nose to generate torque — tilts rocket toward hole
                const noseAngle = rocket.body.angle - Math.PI / 2;
                const nosePoint = {
                    x: rocket.body.position.x + Math.cos(noseAngle) * 40,
                    y: rocket.body.position.y + Math.sin(noseAngle) * 40,
                };
                this.scene.matter.body.applyForce(rocket.body, nosePoint, {
                    x: nx * strength,
                    y: ny * strength,
                });

                if (e.forceSound) {
                    if (!e.forceSound.isPlaying) e.forceSound.play();
                    const targetVol = (0.15 + falloff * 0.55) * GameState.getSfxVolume();
                    (e.forceSound as Phaser.Sound.WebAudioSound).volume = targetVol;
                }
            } else if (e.forceSound && e.forceSound.isPlaying) {
                (e.forceSound as Phaser.Sound.WebAudioSound).volume = 0;
                e.forceSound.stop();
            }
        }
    }

    private fadeOutBlackHole(e: AmbientElement, duration: number): void {
        if (e.fadingOut) return;
        e.fadingOut = true;
        if (e.forceSound && e.forceSound.isPlaying) e.forceSound.stop();
        this.scene.tweens.add({
            targets: e.obj,
            alpha: 0,
            duration,
            onComplete: () => {
                if (e.forceSound) e.forceSound.destroy();
                e.obj.destroy();
                const idx = this.activeElements.indexOf(e);
                if (idx >= 0) this.activeElements.splice(idx, 1);
            },
        });
    }
}
