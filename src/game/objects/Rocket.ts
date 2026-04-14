import { Scene } from 'phaser';
import { GameState, RocketConfig } from '../GameState';
import { PARTS, BASE_FUEL } from '../parts';

export class Rocket {
    scene: Scene;
    body!: MatterJS.BodyType;
    private config: RocketConfig;

    // Runtime state
    fuel: number;
    maxFuel: number;
    hp: number;
    maxHP: number;
    shieldHP: number;
    thrust: number;
    control: number;
    fuelBurn: number;
    dragMultiplier: number;
    angularDamping: number;
    hasMagnet: boolean;

    // Altitude tracking
    startY: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        this.scene = scene;
        this.config = { ...GameState.rocketConfig };

        // Calculate stats from parts
        const nose = PARTS[this.config.nose];
        const body = PARTS[this.config.body];
        const engine = PARTS[this.config.engine];
        const leftMod = this.config.leftModule ? PARTS[this.config.leftModule] : null;
        const rightMod = this.config.rightModule ? PARTS[this.config.rightModule] : null;

        this.thrust = engine.thrust ?? 5;
        this.control = engine.control ?? 0.8;
        this.fuelBurn = engine.fuelBurn ?? 1.0;
        this.dragMultiplier = nose.drag ?? 1.0;
        this.hp = body.hp ?? 1;
        this.maxHP = this.hp;

        // Module bonuses
        let bonusFuel = 0;
        this.shieldHP = 0;
        this.angularDamping = 0.01; // base
        this.hasMagnet = false;

        for (const mod of [leftMod, rightMod]) {
            if (!mod) continue;
            if (mod.bonusFuel) bonusFuel += mod.bonusFuel;
            if (mod.shieldHP) this.shieldHP += mod.shieldHP;
            if (mod.rotationDamping) this.angularDamping = mod.rotationDamping;
        }

        this.maxFuel = BASE_FUEL + bonusFuel;
        this.fuel = this.maxFuel;

        // Calculate total weight and center of mass offset
        const totalWeight = (nose.weight ?? 0) + (body.weight ?? 0) + (engine.weight ?? 0)
            + (leftMod?.weight ?? 0) + (rightMod?.weight ?? 0);

        // Asymmetry: difference between left and right module weights
        const leftWeight = leftMod?.weight ?? 0;
        const rightWeight = rightMod?.weight ?? 0;
        const asymmetry = (rightWeight - leftWeight) * 2; // offset in pixels

        // Create compound body parts
        const parts = this.scene.matter.bodies.rectangle(x + asymmetry, y, 30, 80, {
            label: 'rocket',
            frictionAir: this.angularDamping,
            density: totalWeight * 0.003,
        });

        this.body = parts;
        this.startY = y;

        this.scene.matter.world.add(this.body);
    }

    getAltitude(): number {
        return Math.max(0, this.startY - this.body.position.y);
    }

    applyThrust(delta: number) {
        if (this.fuel <= 0) return;

        const angle = this.body.angle - Math.PI / 2; // "up" direction of body
        const forceX = Math.cos(angle) * this.thrust * 0.004;
        const forceY = Math.sin(angle) * this.thrust * 0.004;

        this.scene.matter.body.applyForce(this.body, this.body.position, {
            x: forceX,
            y: forceY,
        });

        this.fuel -= this.fuelBurn * (delta / 1000);
        if (this.fuel < 0) this.fuel = 0;
    }

    applySideThrust(direction: -1 | 1) {
        const angle = this.body.angle;
        const force = direction * this.control * 0.0015;

        // Apply at bottom of rocket to create torque
        const applyPoint = {
            x: this.body.position.x + Math.sin(angle) * 40,
            y: this.body.position.y - Math.cos(angle) * 40,
        };

        this.scene.matter.body.applyForce(this.body, applyPoint, {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force,
        });
    }

    applyDrag(zoneMultiplier: number = 1) {
        const vel = this.body.velocity;
        const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        if (speed < 0.1) return;

        const dragForce = this.dragMultiplier * zoneMultiplier * 0.0001;
        this.scene.matter.body.applyForce(this.body, this.body.position, {
            x: -vel.x * dragForce,
            y: -vel.y * dragForce,
        });
    }

    takeDamage(): boolean {
        if (this.shieldHP > 0) {
            this.shieldHP--;
            return false; // survived
        }
        this.hp--;
        return this.hp <= 0; // true = destroyed
    }

    destroy() {
        this.scene.matter.world.remove(this.body);
    }
}
