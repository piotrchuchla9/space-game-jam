import { Scene } from "phaser";
import { Rocket } from "../objects/Rocket";
import { InputManager } from "../systems/InputManager";
import { ZoneManager } from "../systems/ZoneManager";
import { ZoneAmbient } from "../systems/ZoneAmbient";
import { GameState } from "../GameState";

export class FlightScene extends Scene {
  private rocket!: Rocket;
  private inputManager!: InputManager;
  private zoneManager!: ZoneManager;
  private zoneAmbient!: ZoneAmbient;
  private altitude: number = 0;
  private maxAltitude: number = 0;
  private maxSpeed: number = 0;
  private isThrusting: boolean = false;
  private crashed: boolean = false;
  private gearsCollected: number = 0;
  private launchTime: number = 0;
  private timerStarted: boolean = false;
  private currentZoom: number = 1.4;
  private currentFollowOffsetY: number = 150;
  private flameSprites: Phaser.GameObjects.Ellipse[] = [];
  private shieldBubble!: Phaser.GameObjects.Graphics;
  private thrusterSound!: Phaser.Sound.BaseSound;
  private fuelAlertSound!: Phaser.Sound.BaseSound;

  constructor() {
    super("FlightScene");
  }

  preload() {
    this.load.image("rocket", "assets/rocket.png");
    this.load.image("ground", "assets/ground.png");
    this.load.image("gear", "assets/gear.png");
    this.load.image("bird", "assets/bird.png");
    this.load.audio("thrusterFire", "assets/thrusterFire.ogg");
    this.load.audio("explosionCrunch", "assets/explosionCrunch.ogg");
    this.load.audio("gearPickup", "assets/gear.mp3");
    this.load.audio("birdHit", "assets/bird.mp3");
    this.load.audio("fuelPickup", "assets/fuel.mp3");
    this.load.audio("fuelAlert", "assets/fuelAlert.mp3");
    this.load.audio("boost", "assets/boost.mp3");
    this.load.audio("shield", "assets/shield.mp3");
    this.load.image("canister", "assets/canister.png");
    this.load.image("storm", "assets/storm.png");
    this.load.audio("storm", "assets/storm.mp3");
    this.load.image("meteor", "assets/meteor.png");
    this.load.audio("meteor", "assets/meteor.mp3");

    this.load.image("station_003", "assets/station_005.png");

    for (let i = 1; i <= 9; i++) {
      this.load.image(`cloud${i}`, `assets/clouds/cloud${i}.png`);
    }
  }

  create() {
    this.crashed = false;
    this.launchTime = 0;
    this.timerStarted = false;

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

    // Side walls — bouncy red/white striped barriers
    this.buildSideWalls(-3000, 3720, -50000, 1280);

    // Create rocket at bottom center
    this.gearsCollected = 0;
    this.rocket = new Rocket(this, 360, 1100);
    this.inputManager = new InputManager(this);
    this.zoneManager = new ZoneManager(this);
    this.zoneAmbient = new ZoneAmbient(this);

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
          if (this.rocket.isShieldActive) {
            // Shield absorbs the bird — destroy it silently
            this.zoneManager.removeObstacleByBody(birdBody);
          } else {
            this.rocket.applyBirdHit(birdBody.velocity.x);
            this.sound.play("birdHit", { volume: GameState.getSfxVolume() });
            this.zoneManager.removeObstacleByBody(birdBody);
          }
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
          this.sound.play("gearPickup", { volume: GameState.getSfxVolume() });
          this.gearsCollected++;
          this.events.emit("gearCollected", this.gearsCollected);
        }

        if (labels.includes("rocket") && labels.includes("canister")) {
          const canisterBody =
            pair.bodyA.label === "canister" ? pair.bodyA : pair.bodyB;
          this.zoneManager.removeCanisterByBody(canisterBody);
          this.rocket.addFuel(this.rocket.maxFuel * 0.25);
          this.sound.play("fuelPickup", { volume: GameState.getSfxVolume() });
        }

        if (labels.includes("rocket") && labels.includes("flame")) {
          const flameBody =
            pair.bodyA.label === "flame" ? pair.bodyA : pair.bodyB;
          this.zoneManager.removeFlameByBody(flameBody);
          this.rocket.activateBoost(1000);
          this.sound.play("boost", { volume: GameState.getSfxVolume() });
          this.showBoostNotification();
        }

        if (labels.includes("rocket") && labels.includes("meteor")) {
          const meteorBody =
            pair.bodyA.label === "meteor" ? pair.bodyA : pair.bodyB;
          if (this.rocket.isShieldActive) {
            this.zoneManager.removeMeteorByBody(meteorBody);
          } else {
            this.rocket.applyBirdHit(meteorBody.velocity.x);
            this.sound.play("meteor", { volume: GameState.getSfxVolume() });
            this.zoneManager.removeMeteorByBody(meteorBody);
          }
        }

        if (labels.includes("rocket") && labels.includes("storm")) {
          const stormBody =
            pair.bodyA.label === "storm" ? pair.bodyA : pair.bodyB;
          this.zoneManager.removeStormByBody(stormBody);
          this.rocket.activateSlowdown(2000);
          this.sound.play("storm", { volume: GameState.getSfxVolume() });
        }

        if (labels.includes("rocket") && labels.includes("shield")) {
          const shieldBody =
            pair.bodyA.label === "shield" ? pair.bodyA : pair.bodyB;
          this.zoneManager.removeShieldByBody(shieldBody);
          this.rocket.activateShield(3000);
          this.sound.play("shield", { volume: GameState.getSfxVolume() });
          this.showShieldNotification();
        }
      }
    });

    this.maxAltitude = 0;
    this.maxSpeed = 0;

    // Launch HUD (stop first to avoid stale listeners on restart)
    this.scene.stop("HUDScene");
    this.scene.launch("HUDScene");

    this.events.on("selfDestruct", () => {
      if (this.maxAltitude > 50) this.crash();
    });

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

    // Shield bubble visual — follows rocket when shield is active
    this.shieldBubble = this.add.graphics();
    this.shieldBubble.setVisible(false);
    this.shieldBubble.setDepth(10);

    this.thrusterSound = this.sound.add("thrusterFire", {
      loop: true,
      volume: GameState.getSfxVolume(),
    });
    this.fuelAlertSound = this.sound.add("fuelAlert", {
      loop: true,
      volume: GameState.getSfxVolume(),
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
      if (!this.timerStarted) {
        this.timerStarted = true;
        this.launchTime = this.time.now;
      }
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
    this.zoneAmbient.update(
      delta,
      this.altitude,
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
    );

    // Emit HUD update
    const vel = this.rocket.body.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    const speedDisplay = Math.round(speed * 10);

    // Camera zoom + offset based on speed — offset scales with zoom so rocket stays on-screen
    let targetZoom: number;
    let targetOffsetY: number;
    if (speedDisplay <= 0) {
      targetZoom = 1.8;
      targetOffsetY = 150;
    } else if (speedDisplay <= 40) {
      targetZoom = 1.3;
      targetOffsetY = 250;
    } else if (speedDisplay <= 80) {
      targetZoom = 1.0;
      targetOffsetY = 370;
    } else {
      targetZoom = 0.8;
      targetOffsetY = 500;
    }
    const lerpFactor = Math.min(1, delta * 0.002);
    this.currentZoom += (targetZoom - this.currentZoom) * lerpFactor;
    this.currentFollowOffsetY +=
      (targetOffsetY - this.currentFollowOffsetY) * lerpFactor;
    this.cameras.main.setZoom(this.currentZoom);
    this.cameras.main.setFollowOffset(0, this.currentFollowOffsetY);
    if (speedDisplay > this.maxSpeed) {
      this.maxSpeed = speedDisplay;
    }
    this.events.emit("updateHUD", {
      altitude: Math.floor(this.altitude),
      fuel: this.rocket.fuel,
      maxFuel: this.rocket.maxFuel,
      zone: zoneName,
      gears: this.gearsCollected,
      speed: speedDisplay,
      time: this.timerStarted ? (this.time.now - this.launchTime) / 1000 : 0,
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
    const outOfFuel = this.rocket.fuel <= 0 && this.maxAltitude > 50;
    if (outOfFuel && !this.fuelAlertSound.isPlaying) {
      this.fuelAlertSound.play();
    } else if (!outOfFuel && this.fuelAlertSound.isPlaying) {
      this.fuelAlertSound.stop();
    }

    if (this.isThrusting && !this.thrusterSound.isPlaying) {
      this.thrusterSound.play();
    } else if (!this.isThrusting && this.thrusterSound.isPlaying) {
      this.thrusterSound.stop();
    }

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

    // Shield bubble — animated cyan ring around rocket
    if (this.rocket.isShieldActive) {
      this.shieldBubble.setVisible(true);
      this.shieldBubble.setPosition(
        this.rocket.body.position.x,
        this.rocket.body.position.y,
      );
      const pulse = 0.85 + Math.sin(_time * 0.006) * 0.15;
      this.shieldBubble.clear();
      this.shieldBubble.lineStyle(3, 0x00ccff, 0.85 * pulse);
      this.shieldBubble.strokeCircle(0, 0, 48 * pulse);
      this.shieldBubble.lineStyle(1.5, 0x66eeff, 0.4 * pulse);
      this.shieldBubble.strokeCircle(0, 0, 56 * pulse);
      this.shieldBubble.fillStyle(0x0088cc, 0.08 * pulse);
      this.shieldBubble.fillCircle(0, 0, 48 * pulse);
    } else {
      this.shieldBubble.setVisible(false);
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

  private showBoostNotification() {
    const cam = this.cameras.main;
    const text = this.add
      .text(cam.centerX, cam.centerY - 80, "BOOST!", {
        fontSize: "52px",
        color: "#ff6600",
        fontFamily: "KenneyFuture",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: text,
      y: text.y - 70,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => text.destroy(),
    });
  }

  private showShieldNotification() {
    const cam = this.cameras.main;
    const text = this.add
      .text(cam.centerX, cam.centerY - 80, "SHIELD!", {
        fontSize: "52px",
        color: "#00ccff",
        fontFamily: "KenneyFuture",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: text,
      y: text.y - 70,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => text.destroy(),
    });
  }

  private buildSideWalls(left: number, right: number, top: number, bottom: number) {
    const thickness = 40;
    const height = bottom - top;
    const centerY = (top + bottom) / 2;
    const leftX = left + thickness / 2;
    const rightX = right - thickness / 2;

    for (const x of [leftX, rightX]) {
      this.matter.add.rectangle(x, centerY, thickness, height, {
        isStatic: true,
        label: "wall",
        restitution: 1.0,
        friction: 0,
        frictionStatic: 0,
      });
    }

    const g = this.add.graphics().setDepth(-4);
    const stripeW = 40; // stripe thickness measured along the wall
    const angle = Math.PI / 6; // 30 degrees
    const tan = Math.tan(angle);
    // Vertical period along the wall between stripe starts (perpendicular spacing / cos)
    const period = stripeW / Math.cos(angle);
    // Horizontal shear caused by the slope across the wall thickness
    const shear = thickness * tan;

    for (const wallX of [leftX, rightX]) {
      const wx = wallX - thickness / 2;
      // Start above `top` so slanted stripes fully cover the wall
      const startY = top - shear - period;
      const endY = bottom + period;
      let i = 0;
      for (let y = startY; y < endY; y += period) {
        const isRed = i % 2 === 0;
        g.fillStyle(isRed ? 0xd02020 : 0xf5f5f5, 1);
        g.beginPath();
        g.moveTo(wx, y);
        g.lineTo(wx + thickness, y + shear);
        g.lineTo(wx + thickness, y + shear + period);
        g.lineTo(wx, y + period);
        g.closePath();
        g.fillPath();
        i++;
      }
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
    if (this.fuelAlertSound.isPlaying) this.fuelAlertSound.stop();
    this.sound.play("explosionCrunch", { volume: GameState.getSfxVolume() });

    this.cameras.main.shake(300, 0.02);
    this.time.delayedCall(400, () => {
      const elapsedSeconds = this.timerStarted
        ? (this.time.now - this.launchTime) / 1000
        : 0;
      GameState.finishRun(this.maxAltitude, this.gearsCollected, elapsedSeconds, this.maxSpeed);
      if (this.thrusterSound.isPlaying) this.thrusterSound.stop();
      if (this.fuelAlertSound.isPlaying) this.fuelAlertSound.stop();
      this.flameSprites.forEach((f) => f.destroy());
      this.shieldBubble.destroy();
      this.flameSprites = [];
      this.inputManager.destroy();
      this.rocket.destroy();
      this.zoneManager.destroy();
      this.zoneAmbient.destroy();
      this.scene.stop("HUDScene");
      this.scene.start("CrashScene");
    });
  }
}
