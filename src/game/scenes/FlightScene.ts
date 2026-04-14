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
  private currentZoom: number = 1.4;
  private currentFollowOffsetY: number = 150;
  private flameSprites: Phaser.GameObjects.Ellipse[] = [];

  constructor() {
    super("FlightScene");
  }

  preload() {
    this.load.image("rocket", "assets/rocket.png");
    this.load.image("ground", "assets/ground.png");
    this.load.image("gear", "assets/gear.png");
    this.load.image("bird", "assets/bird.png");
    this.load.image("canister", "assets/canister.png");

    this.load.image("station_003", "assets/station_005.png");
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
    this.cameras.main.setFollowOffset(0, this.currentFollowOffsetY);
    this.cameras.main.setZoom(this.currentZoom);

    // Store reference for camera tracking
    this.data.set("rocketGraphic", rocketGraphic);

    // Launch pad under rocket
    this.buildLaunchPad();

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
          const birdBody =
            pair.bodyA.label === "bird" ? pair.bodyA : pair.bodyB;
          this.rocket.applyBirdHit(birdBody.velocity.x);
          this.zoneManager.removeObstacleByBody(birdBody);
        }

        if (labels.includes("rocket") && labels.includes("ground")) {
          if (this.maxAltitude > 50) {
            this.crash();
          }
        }

        if (labels.includes("rocket") && labels.includes("gear")) {
          const gearBody =
            pair.bodyA.label === "gear" ? pair.bodyA : pair.bodyB;
          this.zoneManager.removeGearByBody(gearBody);
          this.gearsCollected++;
          this.events.emit("gearCollected", this.gearsCollected);
        }

        if (labels.includes("rocket") && labels.includes("canister")) {
          const canisterBody =
            pair.bodyA.label === "canister" ? pair.bodyA : pair.bodyB;
          this.zoneManager.removeCanisterByBody(canisterBody);
          this.rocket.addFuel(this.rocket.maxFuel * 0.25);
        }
      }
    });

    this.maxAltitude = 0;

    // Launch HUD (stop first to avoid stale listeners on restart)
    this.scene.stop("HUDScene");
    this.scene.launch("HUDScene");

    // Flame visuals — 3 layered ellipses for animated fire effect
    const flameColors = [0xff4500, 0xff8c00, 0xffdd00];
    const flameSizes = [
      { w: 14, h: 30 },
      { w: 10, h: 24 },
      { w: 6, h: 18 },
    ];
    this.flameSprites = flameColors.map((color, i) => {
      const flame = this.add.ellipse(0, 0, flameSizes[i].w, flameSizes[i].h, color);
      flame.setAlpha(0.9 - i * 0.1);
      flame.setVisible(false);
      return flame;
    });
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

    // Camera zoom + offset: zoomed in before launch, zoom out after
    const targetZoom = this.altitude > 0 ? 0.8 : 1.4;
    const targetOffsetY = this.altitude > 0 ? 500 : 150;
    const lerpFactor = Math.min(1, delta * 0.002);
    this.currentZoom += (targetZoom - this.currentZoom) * lerpFactor;
    this.currentFollowOffsetY +=
      (targetOffsetY - this.currentFollowOffsetY) * lerpFactor;
    this.cameras.main.setZoom(this.currentZoom);
    this.cameras.main.setFollowOffset(0, this.currentFollowOffsetY);

    // Zone manager update (spawning gears/obstacles)
    this.zoneManager.update(delta, this.altitude, this.rocket.body.position.x);

    // Emit HUD update
    const vel = this.rocket.body.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    this.events.emit("updateHUD", {
      altitude: Math.floor(this.altitude),
      fuel: this.rocket.fuel,
      maxFuel: this.rocket.maxFuel,
      zone: zoneName,
      gears: this.gearsCollected,
      speed: Math.round(speed * 10),
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

    // Update flame sprites — follow rocket exhaust and animate
    const exhaustAngle = this.rocket.body.angle + Math.PI / 2;
    const exhaustX = this.rocket.body.position.x + Math.cos(exhaustAngle) * 40;
    const exhaustY = this.rocket.body.position.y + Math.sin(exhaustAngle) * 40;
    for (let i = 0; i < this.flameSprites.length; i++) {
      const flame = this.flameSprites[i];
      flame.setVisible(this.isThrusting);
      if (this.isThrusting) {
        // Offset each layer slightly further from exhaust
        const offset = i * 4;
        flame.setPosition(
          exhaustX + Math.cos(exhaustAngle) * offset,
          exhaustY + Math.sin(exhaustAngle) * offset,
        );
        flame.setRotation(this.rocket.body.angle);
        // Flicker animation
        const flicker = 0.7 + Math.random() * 0.3;
        flame.setScale(flicker, 0.8 + Math.random() * 0.4);
      }
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

  private buildLaunchPad() {
    const rx = 360; // rocket x
    const groundY = 1215;
    const padW = 160; // display width for all pieces
    const depth = -1;

    this.add
      .image(rx, groundY, "station_003")
      .setDisplaySize(padW, 28)
      .setOrigin(0.5, 1)
      .setDepth(depth);
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
      this.flameSprites.forEach((f) => f.destroy());
      this.flameSprites = [];
      this.inputManager.destroy();
      this.rocket.destroy();
      this.zoneManager.destroy();
      this.scene.stop("HUDScene");
      this.scene.start("CrashScene");
    });
  }
}
