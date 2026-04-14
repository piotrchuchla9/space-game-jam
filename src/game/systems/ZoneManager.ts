import { Scene } from 'phaser';
import { spawnObstacle, ObstacleType } from '../objects/Obstacle';
import { spawnGear } from '../objects/Gear';

interface SpawnedEntity {
    graphic: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
    body: MatterJS.BodyType;
}

export class ZoneManager {
    private scene: Scene;
    private obstacles: SpawnedEntity[] = [];
    private gears: SpawnedEntity[] = [];
    private spawnTimer: number = 0;
    private gearTimer: number = 0;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    update(delta: number, altitude: number, rocketX: number) {
        this.spawnTimer += delta;
        this.gearTimer += delta;

        // Spawn obstacles based on zone
        const spawnInterval = this.getSpawnInterval(altitude);
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            this.spawnObstacleForZone(altitude, rocketX);
        }

        // Spawn gears
        const gearInterval = altitude < 1000 ? 2000 : altitude < 3000 ? 1200 : 2500;
        if (this.gearTimer >= gearInterval) {
            this.gearTimer = 0;
            this.spawnGearNearRocket(altitude, rocketX);
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
    }

    private getSpawnInterval(altitude: number): number {
        const base = 2000; // ms
        const reduction = Math.floor(altitude / 500) * 100;
        return Math.max(500, base - reduction);
    }

    private spawnObstacleForZone(altitude: number, rocketX: number) {
        let type: ObstacleType;
        if (altitude < 1000) type = 'bird';
        else if (altitude < 3000) type = 'cloud';
        else type = 'asteroid';

        // Spawn to side of rocket, at rocket's altitude
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = rocketX + side * (400 + Math.random() * 200);
        const rocketY = 1100 - altitude; // convert altitude to world Y
        const y = rocketY - 300 - Math.random() * 600; // above rocket

        const entity = spawnObstacle(this.scene, x, y, type);
        this.obstacles.push(entity);
    }

    private spawnGearNearRocket(altitude: number, rocketX: number) {
        const x = rocketX + (Math.random() - 0.5) * 500;
        const rocketY = 1100 - altitude;
        const y = rocketY - 400 - Math.random() * 400;

        const entity = spawnGear(this.scene, x, y);
        this.gears.push(entity);
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
    }

    removeGearByBody(gearBody: MatterJS.BodyType) {
        const idx = this.gears.findIndex(g => g.body === gearBody || g.body.id === gearBody.id);
        if (idx >= 0) {
            this.gears[idx].graphic.destroy();
            this.scene.matter.world.remove(this.gears[idx].body);
            this.gears.splice(idx, 1);
        }
    }

    destroy() {
        for (const e of [...this.obstacles, ...this.gears]) {
            e.graphic.destroy();
        }
        this.obstacles = [];
        this.gears = [];
    }
}
