import { Scene } from 'phaser';
import { spawnObstacle, ObstacleType } from '../objects/Obstacle';
import { spawnGear } from '../objects/Gear';
import { spawnCanister } from '../objects/Canister';
import { spawnFlame } from '../objects/Flame';
import { spawnShield } from '../objects/Shield';
import { spawnStormObstacle } from '../objects/StormObstacle';
import { spawnMeteorObstacle } from '../objects/MeteorObstacle';

export type MinimapItem = {
    x: number;
    y: number;
    type: 'gear' | 'canister' | 'flame' | 'shield';
};

interface SpawnedEntity {
    graphic: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
    body: MatterJS.BodyType;
    type?: string;
    trail?: Phaser.GameObjects.Particles.ParticleEmitter;
    birdWave?: {
        baseY: number;
        amplitude: number;
        frequency: number;
        phase: number;
    };
}

interface PlannedSpawn {
    altitude: number;
    x: number;
    type: 'gear' | 'canister' | 'flame' | 'shield' | 'storm';
}

export class ZoneManager {
    private scene: Scene;
    private obstacles: SpawnedEntity[] = [];
    private gears: SpawnedEntity[] = [];
    private canisters: SpawnedEntity[] = [];
    private flames: SpawnedEntity[] = [];
    private shields: SpawnedEntity[] = [];
    private storms: SpawnedEntity[] = [];
    private meteors: SpawnedEntity[] = [];
    private spawnTimer: number = 0;
    private meteorTimer: number = 0;
    private elapsed: number = 0;
    private endgameMeteorBatchCount: number = 0;
    private meteorBurstRemaining: number = 0;
    private meteorBurstTimer: number = 0;
    private endgameCollectibleBatchCount: number = 0;
    private plannedSpawns: PlannedSpawn[] = [];
    private nextSpawnIndex: number = 0;

    constructor(scene: Scene) {
        this.scene = scene;
        this.plannedSpawns = this.generateSpawnMap(50000);
    }

    update(delta: number, altitude: number, rocketX: number) {
        this.spawnTimer += delta;
        this.meteorTimer += delta;
        this.elapsed += delta;

        // Spawn obstacles based on zone (birds only — space zone uses dedicated meteors)
        if (altitude < 15000) {
            const spawnInterval = this.getSpawnInterval(altitude);
            if (this.spawnTimer >= spawnInterval) {
                this.spawnTimer = 0;
                this.spawnObstacleForZone(altitude, rocketX);
            }
        }

        // Spawn meteor obstacles — space zone only
        if (altitude >= 15000) {
            if (this.meteorTimer >= 2000) {
                this.meteorTimer = 0;
                this.spawnMeteorNearRocket(altitude, rocketX);
            }
        }

        // Endgame: burst of meteors + collectibles at each 10k milestone past the moon
        if (altitude >= 50000) {
            const newBatchCount = Math.floor((altitude - 50000) / 10000) + 1;
            if (newBatchCount > this.endgameMeteorBatchCount) {
                this.endgameMeteorBatchCount = newBatchCount;
                this.meteorBurstRemaining = 10;
                this.meteorBurstTimer = 0;
            }
            if (newBatchCount > this.endgameCollectibleBatchCount) {
                this.endgameCollectibleBatchCount = newBatchCount;
                this.generateEndgameCollectibleBatch(newBatchCount);
            }
        }
        if (this.meteorBurstRemaining > 0) {
            this.meteorBurstTimer += delta;
            if (this.meteorBurstTimer >= 400) {
                this.meteorBurstTimer = 0;
                this.meteorBurstRemaining--;
                this.spawnMeteorNearRocket(altitude, rocketX);
            }
        }

        // Lazy-spawn collectibles: create physics bodies only for items
        // within the upcoming window (2500 altitude units ahead of rocket).
        // plannedSpawns is sorted by altitude, nextSpawnIndex advances forward only.
        const spawnAheadWindow = 2500;
        while (this.nextSpawnIndex < this.plannedSpawns.length) {
            const spawn = this.plannedSpawns[this.nextSpawnIndex];
            if (spawn.altitude > altitude + spawnAheadWindow) break;
            this.instantiatePlannedSpawn(spawn.type, spawn.x, 1100 - spawn.altitude);
            this.nextSpawnIndex++;
        }

        // Cleanup far-away entities
        this.cleanup(rocketX, altitude);

        // Turbulence zone: apply random forces to rocket
        if (altitude >= 1000 && altitude < 3000) {
            if (Math.random() < delta / 3000) {
                this.applyTurbulence();
            }
        }

        // Birds: sinusoidal vertical motion
        for (const e of this.obstacles) {
            if (e.birdWave) {
                const targetY = e.birdWave.baseY
                    + Math.sin(this.elapsed * e.birdWave.frequency + e.birdWave.phase) * e.birdWave.amplitude;
                this.scene.matter.body.setPosition(e.body, { x: e.body.position.x, y: targetY });
            }
        }

        // Sync graphics to physics bodies
        for (const e of this.obstacles) {
            e.graphic.setPosition(e.body.position.x, e.body.position.y);
            e.graphic.setRotation(e.body.angle);
        }
        for (const e of this.gears) {
            e.graphic.setPosition(e.body.position.x, e.body.position.y);
        }
        for (const e of this.canisters) {
            e.graphic.setPosition(e.body.position.x, e.body.position.y);
        }
        for (const e of this.flames) {
            e.graphic.setPosition(e.body.position.x, e.body.position.y);
        }
        for (const e of this.shields) {
            e.graphic.setPosition(e.body.position.x, e.body.position.y);
        }
        for (const e of this.storms) {
            e.graphic.setPosition(e.body.position.x, e.body.position.y);
        }
        for (const e of this.meteors) {
            e.graphic.setPosition(e.body.position.x, e.body.position.y);
            if (e.trail) {
                const vx = e.body.velocity.x;
                const vy = e.body.velocity.y;
                const mag = Math.sqrt(vx * vx + vy * vy) || 1;
                const trailOffset = 35;
                e.trail.setPosition(
                    e.body.position.x - (vx / mag) * trailOffset,
                    e.body.position.y - (vy / mag) * trailOffset,
                );
            }
        }
    }

    private getSpawnInterval(altitude: number): number {
        if (altitude < 15000) return 1400; // atmosphere — birds
        const base = 2000;
        const reduction = Math.floor(altitude / 500) * 100;
        return Math.max(500, base - reduction);
    }

    private spawnObstacleForZone(altitude: number, rocketX: number) {
        let type: ObstacleType;
        if (altitude < 15000) type = 'bird';
        else type = 'asteroid';

        const count = type === 'bird' ? 2 : 1;
        for (let i = 0; i < count; i++) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = rocketX + side * (300 + Math.random() * 400);
            const rocketY = 1100 - altitude;
            const y = type === 'bird'
                ? rocketY - 700 - Math.random() * 400
                : rocketY - 300 - Math.random() * 600;

            const entity = spawnObstacle(this.scene, x, y, type);
            this.obstacles.push(entity);
        }
    }

    private generateSpawnMap(maxAltitude: number = 50000): PlannedSpawn[] {
        const spawns: PlannedSpawn[] = [];
        // Full world horizontal bounds (from matter.world.setBounds in FlightScene)
        const worldLeft = -2600;
        const worldRight = 3560;
        const worldWidth = worldRight - worldLeft;

        const rnd = () => worldLeft + Math.random() * worldWidth;

        const minAltitude = 400;

        // Gears: ~600 fully randomly placed across entire map
        for (let i = 0; i < 600; i++) {
            spawns.push({ altitude: minAltitude + Math.random() * (maxAltitude - minAltitude), x: rnd(), type: 'gear' });
        }

        // Canisters: ~140 randomly placed
        for (let i = 0; i < 140; i++) {
            spawns.push({ altitude: minAltitude + Math.random() * (maxAltitude - minAltitude), x: rnd(), type: 'canister' });
        }

        // Flames: ~70 randomly placed, each independent (no pairing)
        for (let i = 0; i < 70; i++) {
            spawns.push({ altitude: minAltitude + Math.random() * (maxAltitude - minAltitude), x: rnd(), type: 'flame' });
        }

        // Shields: ~80 randomly placed
        for (let i = 0; i < 80; i++) {
            spawns.push({ altitude: minAltitude + Math.random() * (maxAltitude - minAltitude), x: rnd(), type: 'shield' });
        }

        // Storms: ~80 randomly placed in turbulence zone only
        for (let i = 0; i < 80; i++) {
            spawns.push({ altitude: 5000 + Math.random() * 10000, x: rnd(), type: 'storm' });
        }

        return spawns.sort((a, b) => a.altitude - b.altitude);
    }

    private generateEndgameCollectibleBatch(batchIndex: number): void {
        const worldLeft = -2600;
        const worldRight = 3560;
        const batchStart = 50000 + (batchIndex - 1) * 10000;
        const batchEnd = batchStart + 10000;
        const rnd = () => worldLeft + Math.random() * (worldRight - worldLeft);
        const alt = () => batchStart + Math.random() * (batchEnd - batchStart);

        for (let i = 0; i < 20; i++) {
            this.plannedSpawns.push({ altitude: alt(), x: rnd(), type: 'gear' });
        }
        for (let i = 0; i < 5; i++) {
            this.plannedSpawns.push({ altitude: alt(), x: rnd(), type: 'flame' });
        }
    }

    private instantiatePlannedSpawn(type: 'gear' | 'canister' | 'flame' | 'shield' | 'storm', x: number, y: number) {
        switch (type) {
            case 'gear':     this.gears.push(spawnGear(this.scene, x, y)); break;
            case 'canister': this.canisters.push(spawnCanister(this.scene, x, y)); break;
            case 'flame':    this.flames.push(spawnFlame(this.scene, x, y)); break;
            case 'shield':   this.shields.push(spawnShield(this.scene, x, y)); break;
            case 'storm':    this.storms.push(spawnStormObstacle(this.scene, x, y)); break;
        }
    }

    private spawnMeteorNearRocket(altitude: number, rocketX: number) {
        const direction = Math.random() < 0.5 ? -1 : 1;
        // Spawn meteor at top of rocket's viewport, offset to the opposite side of travel direction
        const rocketY = 1100 - altitude;
        const x = rocketX + (direction === 1 ? -400 : 400) + (Math.random() - 0.5) * 300;
        const y = rocketY - 900 - Math.random() * 300;

        const entity = spawnMeteorObstacle(this.scene, x, y, direction);
        this.meteors.push(entity);
    }

    private applyTurbulence() {
        // Emit event for FlightScene to apply force to rocket
        this.scene.events.emit('turbulence', {
            x: (Math.random() - 0.5) * 0.002,
            y: 0,
        });
    }

    private cleanup(rocketX: number, altitude: number) {
        const rocketY = 1100 - altitude;
        const maxDist = 2000;

        this.obstacles = this.obstacles.filter(e => {
            const dist = Math.abs(e.body.position.y - rocketY) + Math.abs(e.body.position.x - rocketX);
            if (dist > maxDist) {
                e.graphic.destroy();
                this.scene.matter.world.remove(e.body);
                return false;
            }
            return true;
        });

        // Keep collectibles within 8000px below the rocket so it can collect on the way down.
        // Beyond that range the rocket can't realistically reach them — remove to keep physics lean.
        const belowCutoff = rocketY + 8000;
        const removeCollectible = (e: SpawnedEntity, below: number) => {
            if (!e.body.id) return true;
            if (e.body.position.y > below) {
                e.graphic.destroy();
                this.scene.matter.world.remove(e.body);
                return true;
            }
            return false;
        };
        this.gears = this.gears.filter(e => !removeCollectible(e, belowCutoff));
        this.canisters = this.canisters.filter(e => !removeCollectible(e, belowCutoff));
        this.flames = this.flames.filter(e => !removeCollectible(e, belowCutoff));
        this.shields = this.shields.filter(e => !removeCollectible(e, belowCutoff));

        this.meteors = this.meteors.filter(e => {
            if (!e.body.id) return false;
            const dist = Math.abs(e.body.position.y - rocketY) + Math.abs(e.body.position.x - rocketX);
            if (dist > maxDist) {
                e.trail?.destroy();
                e.graphic.destroy();
                this.scene.matter.world.remove(e.body);
                return false;
            }
            return true;
        });

        this.storms = this.storms.filter(e => {
            if (!e.body.id) return false;
            if (e.body.position.y > rocketY + 500) {
                e.graphic.destroy();
                this.scene.matter.world.remove(e.body);
                return false;
            }
            return true;
        });
    }

    removeObstacleByBody(obstacleBody: MatterJS.BodyType) {
        const idx = this.obstacles.findIndex(o => o.body === obstacleBody || o.body.id === obstacleBody.id);
        if (idx >= 0) {
            this.obstacles[idx].graphic.destroy();
            this.scene.matter.world.remove(this.obstacles[idx].body);
            this.obstacles.splice(idx, 1);
        }
    }

    removeGearByBody(gearBody: MatterJS.BodyType) {
        const idx = this.gears.findIndex(g => g.body === gearBody || g.body.id === gearBody.id);
        if (idx >= 0) {
            this.gears[idx].graphic.destroy();
            this.scene.matter.world.remove(this.gears[idx].body);
            this.gears.splice(idx, 1);
        }
    }

    removeCanisterByBody(canisterBody: MatterJS.BodyType) {
        const idx = this.canisters.findIndex(c => c.body === canisterBody || c.body.id === canisterBody.id);
        if (idx >= 0) {
            this.canisters[idx].graphic.destroy();
            this.scene.matter.world.remove(this.canisters[idx].body);
            this.canisters.splice(idx, 1);
        }
    }

    removeShieldByBody(shieldBody: MatterJS.BodyType) {
        const idx = this.shields.findIndex(s => s.body === shieldBody || s.body.id === shieldBody.id);
        if (idx >= 0) {
            this.shields[idx].graphic.destroy();
            this.scene.matter.world.remove(this.shields[idx].body);
            this.shields.splice(idx, 1);
        }
    }

    removeMeteorByBody(meteorBody: MatterJS.BodyType) {
        const idx = this.meteors.findIndex(m => m.body === meteorBody || m.body.id === meteorBody.id);
        if (idx >= 0) {
            this.meteors[idx].trail?.destroy();
            this.meteors[idx].graphic.destroy();
            this.scene.matter.world.remove(this.meteors[idx].body);
            this.meteors.splice(idx, 1);
        }
    }

    removeStormByBody(stormBody: MatterJS.BodyType) {
        const idx = this.storms.findIndex(s => s.body === stormBody || s.body.id === stormBody.id);
        if (idx >= 0) {
            this.storms[idx].graphic.destroy();
            this.scene.matter.world.remove(this.storms[idx].body);
            this.storms.splice(idx, 1);
        }
    }

    removeFlameByBody(flameBody: MatterJS.BodyType) {
        const idx = this.flames.findIndex(f => f.body === flameBody || f.body.id === flameBody.id);
        if (idx >= 0) {
            this.flames[idx].graphic.destroy();
            this.scene.matter.world.remove(this.flames[idx].body);
            this.flames.splice(idx, 1);
        }
    }

    getMinimapItems(rocketX: number, rocketY: number, range: number): MinimapItem[] {
        const items: MinimapItem[] = [];
        const inRange = (e: SpawnedEntity) =>
            Math.abs(e.body.position.x - rocketX) <= range
            && Math.abs(e.body.position.y - rocketY) <= range;

        for (const g of this.gears) {
            if (inRange(g)) items.push({ x: g.body.position.x, y: g.body.position.y, type: 'gear' });
        }
        for (const c of this.canisters) {
            if (inRange(c)) items.push({ x: c.body.position.x, y: c.body.position.y, type: 'canister' });
        }
        for (const f of this.flames) {
            if (inRange(f)) items.push({ x: f.body.position.x, y: f.body.position.y, type: 'flame' });
        }
        for (const s of this.shields) {
            if (inRange(s)) items.push({ x: s.body.position.x, y: s.body.position.y, type: 'shield' });
        }
        return items;
    }

    destroy() {
        for (const e of [...this.obstacles, ...this.gears, ...this.canisters, ...this.flames, ...this.shields, ...this.storms, ...this.meteors]) {
            e.trail?.destroy();
            e.graphic.destroy();
        }
        this.obstacles = [];
        this.gears = [];
        this.canisters = [];
        this.flames = [];
        this.shields = [];
        this.storms = [];
        this.meteors = [];
    }
}
