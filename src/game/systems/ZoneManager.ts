import { Scene } from 'phaser';
import { spawnObstacle, ObstacleType } from '../objects/Obstacle';
import { spawnGear } from '../objects/Gear';
import { spawnCanister } from '../objects/Canister';
import { spawnFlame } from '../objects/Flame';
import { spawnShield } from '../objects/Shield';
import { spawnStormObstacle } from '../objects/StormObstacle';
import { spawnMeteorObstacle } from '../objects/MeteorObstacle';

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
    private gearTimer: number = 0;
    private canisterTimer: number = 0;
    private flameTimer: number = 0;
    private shieldTimer: number = 0;
    private stormTimer: number = 0;
    private meteorTimer: number = 0;
    private elapsed: number = 0;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    update(delta: number, altitude: number, rocketX: number) {
        this.spawnTimer += delta;
        this.gearTimer += delta;
        this.canisterTimer += delta;
        this.flameTimer += delta;
        this.shieldTimer += delta;
        this.stormTimer += delta;
        this.meteorTimer += delta;
        this.elapsed += delta;

        // Spawn obstacles based on zone
        const spawnInterval = this.getSpawnInterval(altitude);
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            this.spawnObstacleForZone(altitude, rocketX);
        }

        // Spawn gears (only after launch)
        if (altitude > 0) {
            const gearInterval = altitude < 1000 ? 2000 : altitude < 3000 ? 1200 : 2500;
            if (this.gearTimer >= gearInterval) {
                this.gearTimer = 0;
                this.spawnGearNearRocket(altitude, rocketX);
            }
        }

        // Spawn canisters — every ~5s, only during flight
        if (altitude > 0) {
            if (this.canisterTimer >= 5000) {
                this.canisterTimer = 0;
                this.spawnCanisterNearRocket(altitude, rocketX);
            }
        }

        // Spawn flames — every ~5s, 2 at a time, only during flight
        if (altitude > 0) {
            if (this.flameTimer >= 5000) {
                this.flameTimer = 0;
                this.spawnFlameNearRocket(altitude, rocketX);
                this.spawnFlameNearRocket(altitude, rocketX);
            }
        }

        // Spawn shields — every ~8s, only during flight
        if (altitude > 0) {
            if (this.shieldTimer >= 8000) {
                this.shieldTimer = 0;
                this.spawnShieldNearRocket(altitude, rocketX);
            }
        }

        // Spawn storm obstacles — turbulence zone only
        if (altitude >= 5000 && altitude < 15000) {
            if (this.stormTimer >= 3500) {
                this.stormTimer = 0;
                this.spawnStormNearRocket(altitude, rocketX);
            }
        }

        // Spawn meteor obstacles — space zone only
        if (altitude >= 15000) {
            if (this.meteorTimer >= 2000) {
                this.meteorTimer = 0;
                this.spawnMeteorNearRocket(altitude, rocketX);
            }
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

    private spawnGearNearRocket(altitude: number, rocketX: number) {
        const x = rocketX + (Math.random() - 0.5) * 500;
        const rocketY = 1100 - altitude;
        const y = rocketY - 400 - Math.random() * 400;

        const entity = spawnGear(this.scene, x, y);
        this.gears.push(entity);
    }

    private spawnCanisterNearRocket(altitude: number, rocketX: number) {
        const x = rocketX + (Math.random() - 0.5) * 400;
        const rocketY = 1100 - altitude;
        const y = rocketY - 300 - Math.random() * 500;

        const entity = spawnCanister(this.scene, x, y);
        this.canisters.push(entity);
    }

    private spawnShieldNearRocket(altitude: number, rocketX: number) {
        const x = rocketX + (Math.random() - 0.5) * 400;
        const rocketY = 1100 - altitude;
        const y = rocketY - 300 - Math.random() * 500;

        const entity = spawnShield(this.scene, x, y);
        this.shields.push(entity);
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

    private spawnStormNearRocket(altitude: number, rocketX: number) {
        const x = rocketX + (Math.random() - 0.5) * 600;
        const rocketY = 1100 - altitude;
        const y = rocketY - 500 - Math.random() * 600;

        const entity = spawnStormObstacle(this.scene, x, y);
        this.storms.push(entity);
    }

    private spawnFlameNearRocket(altitude: number, rocketX: number) {
        const x = rocketX + (Math.random() - 0.5) * 400;
        const rocketY = 1100 - altitude;
        const y = rocketY - 300 - Math.random() * 500;

        const entity = spawnFlame(this.scene, x, y);
        this.flames.push(entity);
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

        this.gears = this.gears.filter(e => {
            if (!e.body.id) return false; // already removed (collected)
            const dist = Math.abs(e.body.position.y - rocketY) + Math.abs(e.body.position.x - rocketX);
            if (dist > maxDist) {
                e.graphic.destroy();
                this.scene.matter.world.remove(e.body);
                return false;
            }
            return true;
        });

        this.canisters = this.canisters.filter(e => {
            if (!e.body.id) return false;
            const dist = Math.abs(e.body.position.y - rocketY) + Math.abs(e.body.position.x - rocketX);
            if (dist > maxDist) {
                e.graphic.destroy();
                this.scene.matter.world.remove(e.body);
                return false;
            }
            return true;
        });

        this.flames = this.flames.filter(e => {
            if (!e.body.id) return false;
            const dist = Math.abs(e.body.position.y - rocketY) + Math.abs(e.body.position.x - rocketX);
            if (dist > maxDist) {
                e.graphic.destroy();
                this.scene.matter.world.remove(e.body);
                return false;
            }
            return true;
        });

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
            const dist = Math.abs(e.body.position.y - rocketY) + Math.abs(e.body.position.x - rocketX);
            if (dist > maxDist) {
                e.graphic.destroy();
                this.scene.matter.world.remove(e.body);
                return false;
            }
            return true;
        });

        this.shields = this.shields.filter(e => {
            if (!e.body.id) return false;
            const dist = Math.abs(e.body.position.y - rocketY) + Math.abs(e.body.position.x - rocketX);
            if (dist > maxDist) {
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
