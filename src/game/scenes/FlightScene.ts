import { Scene } from "phaser";
import { Rocket } from "../objects/Rocket";
import { InputManager } from "../systems/InputManager";
import { ZoneManager } from "../systems/ZoneManager";
import { GameState } from "../GameState";

export class FlightScene extends Scene {
  private rocket!: Rocket;
  private inputManager!: InputManager;
  private zoneManager!: ZoneManager;
  private altitude: number = 0;
  private maxAltitude: number = 0;
  private isThrusting: boolean = false;
  private crashed: boolean = false;
  private gearsCollected: number = 0;

  constructor() {
    super("FlightScene");
  }

  preload() {
    this.load.image("rocket", "assets/rocket.png");
    this.load.image("ground", "assets/ground.png");
    this.load.image("gear", "assets/gear.png");
    this.load.image("bird", "assets/bird.png");
  }

  create() {
    this.crashed = false;

    // World bounds — wide and tall
    this.matter.world.setBounds(
      -3000,
      -50000,
      6720,
      51280,
      32,
      false,
      false,
      false,
      false,
    );

    // Create rocket at bottom center
    this.gearsCollected = 0;
    this.rocket = new Rocket(this, 360, 1100);
    this.inputManager = new InputManager(this);
    this.zoneManager = new ZoneManager(this);

    // Camera follows rocket
    const rocketGraphic = this.add
      .image(this.rocket.body.position.x, this.rocket.body.position.y, "rocket")
      .setDisplaySize(30, 80);
    this.cameras.main.startFollow(rocketGraphic, false, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, 500);

    // Store reference for camera tracking
    this.data.set("rocketGraphic", rocketGraphic);

    // Underground fill
    this.add.rectangle(360, 1400, 6720, 400, 0x3d3d2e).setDepth(-6);

    // Ground visual strip
    this.add.tileSprite(360, 1215, 6720, 30, "ground").setDepth(-5);

    this.matter.add.rectangle(360, 1250, 720, 100, {
      isStatic: true,
      label: "ground",
    });

    // Collision handling
    this.matter.world.on("collisionstart", (event: any) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];

        if (labels.includes("rocket") && labels.includes("obstacle")) {
          const destroyed = this.rocket.takeDamage();
          if (destroyed) this.crash();
        }

        if (labels.includes("rocket") && labels.includes("bird")) {
          const birdBody = pair.bodyA.label === "bird" ? pair.bodyA : pair.bodyB;
          this.rocket.applyBirdHit(birdBody.velocity.x);
          this.zoneManager.removeObstacleByBody(birdBody);
        }

        if (labels.includes("rocket") && labels.includes("ground")) {
          if (this.maxAltitude > 50) {
            this.crash();
          }
        }

        if (labels.includes("rocket") && labels.includes("gear")) {
          const gearBody = pair.bodyA.label === "gear" ? pair.bodyA : pair.bodyB;
          this.zoneManager.removeGearByBody(gearBody);
          this.gearsCollected++;
          this.events.emit("gearCollected", this.gearsCollected);
        }
      }
    });

    this.maxAltitude = 0;

    // Launch HUD
    this.scene.launch("HUDScene");
  }

  update(_time: number, delta: number) {
    if (!this.rocket || !this.rocket.body || this.crashed) return;

    const inputState = this.inputManager.getState();

    // Debug input every 60 frames
    if (Math.random() < 0.02) {
      console.log(
        "Input state:",
        inputState,
        "Fuel:",
        this.rocket.fuel,
        "Pos:",
        this.rocket.body.position.y,
      );
    }

    // Thrust
    this.isThrusting = inputState.thrust && this.rocket.fuel > 0;
    if (this.isThrusting) {
      this.rocket.applyThrust(delta);
    }

    // Side thrust
    if (inputState.left) this.rocket.applySideThrust(-1);
    if (inputState.right) this.rocket.applySideThrust(1);

    // Drag based on zone
    const alt = this.rocket.getAltitude();
    let dragZone = 1.0;
    let zoneName = "ATMOSPHERE";
    if (alt > 15000) {
      dragZone = 0.1;
      zoneName = "SPACE";
    } else if (alt > 5000) {
      zoneName = "TURBULENCE";
    }
    this.rocket.applyDrag(dragZone);

    // Update altitude
    this.altitude = alt;
    if (this.altitude > this.maxAltitude) {
      this.maxAltitude = this.altitude;
    }

    // Zone manager update (spawning gears/obstacles)
    this.zoneManager.update(delta, this.altitude, this.rocket.body.position.x);

    // Emit HUD update
    this.events.emit("updateHUD", {
      altitude: Math.floor(this.altitude),
      fuel: this.rocket.fuel,
      maxFuel: this.rocket.maxFuel,
      zone: zoneName,
      gears: this.gearsCollected,
    });

    // Update rocket graphic position (for camera)
    const rocketGraphic = this.data.get(
      "rocketGraphic",
    ) as Phaser.GameObjects.Image;
    if (rocketGraphic) {
      rocketGraphic.setPosition(
        this.rocket.body.position.x,
        this.rocket.body.position.y,
      );
      rocketGraphic.setRotation(this.rocket.body.angle);
    }

    let bgColor: number;
    if (this.altitude < 8000) {
      bgColor = this.lerpColor(0x4a90d9, 0x1a3a6e, this.altitude / 8000);
    } else if (this.altitude < 20000) {
      bgColor = this.lerpColor(
        0x1a3a6e,
        0x0a1a3a,
        (this.altitude - 8000) / 12000,
      );
    } else {
      bgColor = 0x0a1a3a;
    }
    this.cameras.main.setBackgroundColor(bgColor);

    // Check if rocket fell below start and has been flying
    if (this.rocket.body.position.y > 1300 && this.maxAltitude > 50) {
      this.crash();
    }
  }

  private lerpColor(from: number, to: number, t: number): number {
    t = Math.max(0, Math.min(1, t));
    const r1 = (from >> 16) & 0xff,
      g1 = (from >> 8) & 0xff,
      b1 = from & 0xff;
    const r2 = (to >> 16) & 0xff,
      g2 = (to >> 8) & 0xff,
      b2 = to & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  private crash() {
    if (this.crashed) return;
    this.crashed = true;

    this.cameras.main.shake(300, 0.02);
    this.time.delayedCall(400, () => {
      GameState.finishRun(this.maxAltitude, this.gearsCollected);
      this.inputManager.destroy();
      this.rocket.destroy();
      this.zoneManager.destroy();
      this.scene.start("CrashScene");
    });
  }
}
