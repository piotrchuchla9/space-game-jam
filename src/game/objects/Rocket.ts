import { Scene } from "phaser";
import { GameState, RocketConfig } from "../GameState";
import { PARTS, BASE_FUEL } from "../parts";

export class Rocket {
  scene: Scene;
  body!: MatterJS.BodyType;
  private config: RocketConfig;

  // Runtime state
  fuel: number;
  maxFuel: number;
  shieldHP: number;
  thrust: number;
  control: number;
  fuelBurn: number;
  dragMultiplier: number;
  angularDamping: number;
  hasMagnet: boolean;

  // Altitude tracking
  startY: number = 0;

  // Boost state
  isBoostActive: boolean = false;

  // Shield state
  isShieldActive: boolean = false;

  constructor(scene: Scene, x: number, y: number) {
    this.scene = scene;
    this.config = { ...GameState.rocketConfig };

    // Calculate stats from parts
    const nose = PARTS[this.config.nose];
    const body = PARTS[this.config.body];
    const engine = PARTS[this.config.engine];
    const sidesMod = this.config.sides ? PARTS[this.config.sides] : null;

    this.thrust = engine.thrust ?? 5;
    this.control = engine.control ?? 0.8;
    this.fuelBurn = engine.fuelBurn ?? 1.0;
    this.dragMultiplier = nose.drag ?? 1.0;

    // Module bonuses (sides is symmetric, applied once)
    let bonusFuel = 0;
    this.shieldHP = 0;
    this.angularDamping = 0.01; // base
    this.hasMagnet = false;

    if (sidesMod) {
      if (sidesMod.bonusFuel) bonusFuel += sidesMod.bonusFuel;
      if (sidesMod.shieldHP) this.shieldHP += sidesMod.shieldHP;
      if (sidesMod.rotationDamping)
        this.angularDamping = sidesMod.rotationDamping;
    }

    this.maxFuel = BASE_FUEL + bonusFuel;
    this.fuel = this.maxFuel;

    // Weight: sides count twice (one on each side visually)
    const sidesWeight = (sidesMod?.weight ?? 0) * 2;
    const totalWeight =
      (nose.weight ?? 0) +
      (body.weight ?? 0) +
      (engine.weight ?? 0) +
      sidesWeight;

    // Create physics body — compound when sides are equipped so wings/pods register hits
    if (sidesMod?.asset) {
      const sideSrc = this.scene.textures.get(sidesMod.asset).source[0];
      const SCALE = 0.45;
      const sideW = (sideSrc?.width ?? 40) * SCALE;
      const sideH = (sideSrc?.height ?? 80) * SCALE;
      const sideOffsetX = 15 + sideW / 2;

      // Parts are positioned in world space; Matter recomputes CoM for the compound body
      const bodyOpts = { label: "rocket" };
      const mainPart = this.scene.matter.bodies.rectangle(
        x,
        y,
        30,
        80,
        bodyOpts,
      );
      const leftPart = this.scene.matter.bodies.rectangle(
        x - sideOffsetX,
        y,
        sideW,
        sideH,
        bodyOpts,
      );
      const rightPart = this.scene.matter.bodies.rectangle(
        x + sideOffsetX,
        y,
        sideW,
        sideH,
        bodyOpts,
      );

      const compound = (this.scene.matter as any).body.create({
        parts: [mainPart, leftPart, rightPart],
        label: "rocket",
        frictionAir: this.angularDamping,
        density: totalWeight * 0.001,
      }) as MatterJS.BodyType;

      this.body = compound;
    } else {
      this.body = this.scene.matter.bodies.rectangle(x, y, 30, 80, {
        label: "rocket",
        frictionAir: this.angularDamping,
        // Keep mass in a range where basic engine can overcome gravity.
        density: totalWeight * 0.001,
      });
    }

    this.startY = y;

    this.scene.matter.world.add(this.body);
  }

  getAltitude(): number {
    return Math.max(0, this.startY - this.body.position.y);
  }

  activateShield(duration: number = 3000) {
    this.isShieldActive = true;
    this.scene.time.delayedCall(duration, () => {
      this.isShieldActive = false;
    });
  }

  activateBoost(duration: number = 1000) {
    this.isBoostActive = true;
    this.scene.time.delayedCall(duration, () => {
      this.isBoostActive = false;
    });
  }

  applyThrust(delta: number) {
    if (this.fuel <= 0) return;

    const angle = this.body.angle - Math.PI / 2; // "up" direction of body
    const boostMultiplier = this.isBoostActive ? 1.5 : 1;
    const forceX = Math.cos(angle) * this.thrust * 0.002 * boostMultiplier;
    const forceY = Math.sin(angle) * this.thrust * 0.002 * boostMultiplier;

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

    const dragForce = this.dragMultiplier * zoneMultiplier * 0.0003;
    this.scene.matter.body.applyForce(this.body, this.body.position, {
      x: -vel.x * dragForce,
      y: -vel.y * dragForce,
    });
  }

  applyBirdHit(birdVelocityX: number) {
    // Tilt rocket in the direction the bird was flying
    const torque = Math.sign(birdVelocityX) * 0.02;
    (this.scene.matter.body as any).setAngularVelocity(
      this.body,
      this.body.angularVelocity + torque,
    );
  }

  addFuel(amount: number) {
    this.fuel = Math.min(this.maxFuel, this.fuel + amount);
  }

  takeDamage(): boolean {
    if (this.shieldHP > 0) {
      this.shieldHP--;
      return false; // survived
    }
    return true; // destroyed
  }

  destroy() {
    this.scene.matter.world.remove(this.body);
  }
}
