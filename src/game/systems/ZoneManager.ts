import { Scene } from 'phaser';
import { spawnObstacle, ObstacleType } from '../objects/Obstacle';
import { spawnGear } from '../objects/Gear';
import { spawnCanister } from '../objects/Canister';

interface SpawnedEntity {
    graphic: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
    body: MatterJS.BodyType;
}

export class ZoneManager {
    private scene: Scene;
    private obstacles: SpawnedEntity[] = [];
    private gears: SpawnedEntity[] = [];
    private canisters: SpawnedEntity[] = [];
    private spawnTimer: number = 0;
    private gearTimer: number = 0;
    private canisterTimer: number = 0;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    update(delta: number, altitude: number, rocketX: number) {
        this.spawnTimer += delta;
        this.gearTimer += delta;
        this.canisterTimer += delta;

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

        // Cleanup far-away entities
        this.cleanup(rocketX, altitude);

        // Turbulence zone: apply random forces to rocket
        if (altitude >= 1000 && altitude < 3000) {
            if (Math.random() < delta / 3000) {
                this.applyTurbulence();
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

    destroy() {
        for (const e of [...this.obstacles, ...this.gears, ...this.canisters]) {
            e.graphic.destroy();
        }
        this.obstacles = [];
        this.gears = [];
        this.canisters = [];
    }
}
