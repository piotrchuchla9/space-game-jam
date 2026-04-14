import { Scene, GameObjects } from "phaser";
import { GameState } from "../GameState";
import { getAchievementName } from "../systems/AchievementManager";

const FONT = "KenneyFuture";

export class HUDScene extends Scene {
  private altText!: GameObjects.Text;
  private spdText!: GameObjects.Text;
  private zoneText!: GameObjects.Text;
  private gearText!: GameObjects.Text;
  private fuelFill!: GameObjects.Rectangle;
  private notificationQueue: string[] = [];
  private isShowingNotification: boolean = false;
  private hudUpdateHandler?: Function;

  constructor() {
    super("HUDScene");
  }

  preload() {
    this.load.font(FONT, "assets/KenneyFuture.ttf");
    this.load.image("ui_panel", "assets/ui_panel.png");
    this.load.image("ui_slide_track", "assets/ui_slide_track.png");
    this.load.image("ui_slide_fill", "assets/ui_slide_fill.png");
    this.load.image("gear", "assets/gear.png");
  }

  create() {
    // --- Left panel: ALT + SPD + ZONE ---
    this.add
      .image(90, 52, "ui_panel")
      .setDisplaySize(160, 80)
      .setAlpha(0.75)
      .setOrigin(0.5, 0.5);

    this.altText = this.add.text(16, 14, "ALT: 0", {
      fontSize: "18px",
      color: "#000000",
      fontFamily: FONT,
    });

    this.spdText = this.add.text(16, 38, "SPD: 0", {
      fontSize: "18px",
      color: "#000000",
      fontFamily: FONT,
    });

    this.zoneText = this.add.text(16, 60, "ATMOSPHERE", {
      fontSize: "15px",
      color: "#000000",
      fontFamily: FONT,
    });

    // --- Center panel: GEARS ---
    this.add
      .image(360, 30, "ui_panel")
      .setDisplaySize(180, 44)
      .setAlpha(0.75)
      .setOrigin(0.5, 0.5);

    this.add.image(290, 30, "gear").setDisplaySize(24, 24).setOrigin(0.5, 0.5);

    this.gearText = this.add
      .text(310, 18, "0", {
        fontSize: "18px",
        color: "#000000",
        fontFamily: FONT,
      })
      .setOrigin(0, 0);

    // --- Right panel: FUEL bar ---
    this.add
      .image(614, 30, "ui_panel")
      .setDisplaySize(160, 44)
      .setAlpha(0.75)
      .setOrigin(0.5, 0.5);

    this.add.text(540, 14, "FUEL", {
      fontSize: "18px",
      color: "#000000",
      fontFamily: FONT,
    });

    // Track (full width, static)
    this.add.rectangle(614, 36, 130, 14, 0x333333).setOrigin(0.5, 0.5);

    // Fill (grows from left)
    this.fuelFill = this.add
      .rectangle(549, 36, 130, 14, 0x44ff44)
      .setOrigin(0, 0.5);

    // Listen for HUD updates from FlightScene
    const flightScene = this.scene.get("FlightScene");
    this.hudUpdateHandler = (data: {
      altitude: number;
      fuel: number;
      maxFuel: number;
      zone: string;
      gears: number;
      speed: number;
    }) => {
      this.altText.setText(`ALT: ${data.altitude}`);
      this.spdText.setText(`SPD: ${data.speed}`);
      this.gearText.setText(`${data.gears}`);

      const zoneColors: Record<string, string> = {
        ATMOSPHERE: "#1144aa",
        TURBULENCE: "#883300",
        SPACE: "#440088",
      };
      this.zoneText.setText(data.zone);
      this.zoneText.setColor(zoneColors[data.zone] ?? "#000000");

      const pct = Math.max(0, data.fuel / data.maxFuel);
      this.fuelFill.setSize(130 * pct, 14);
      this.fuelFill.setFillStyle(pct > 0.3 ? 0x44ff44 : 0xff4444);
    };
    flightScene.events.on("updateHUD", this.hudUpdateHandler, this);

    // Clean up the cross-scene listener when this scene shuts down
    this.events.on("shutdown", () => {
      flightScene.events.off("updateHUD", this.hudUpdateHandler as Function, this);
    });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (GameState.pendingAchievementNotifications.length > 0) {
          this.notificationQueue.push(
            ...GameState.pendingAchievementNotifications,
          );
          GameState.pendingAchievementNotifications = [];
          if (!this.isShowingNotification) {
            this.showNextNotification();
          }
        }
      },
    });

    this.checkPendingAchievements();
  }

  private checkPendingAchievements() {
    if (GameState.pendingAchievementNotifications.length > 0) {
      this.notificationQueue.push(...GameState.pendingAchievementNotifications);
      GameState.pendingAchievementNotifications = [];
      this.showNextNotification();
    }
  }

  private showNextNotification() {
    if (this.notificationQueue.length === 0) {
      this.isShowingNotification = false;
      return;
    }

    this.isShowingNotification = true;
    const achievementId = this.notificationQueue.shift()!;
    const name = getAchievementName(achievementId);

    const screenH = this.cameras.main.height;
    const bannerY = screenH + 30;
    const targetY = screenH - 50;

    const bg = this.add
      .rectangle(360, bannerY, 400, 50, 0x000000, 0.8)
      .setStrokeStyle(1, 0xffcc00);

    const text = this.add
      .text(360, bannerY, `ACHIEVEMENT: ${name}`, {
        fontSize: "16px",
        color: "#ffcc00",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Slide in from bottom
    this.tweens.add({
      targets: [bg, text],
      y: targetY,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // Hold for 3 seconds, then slide out
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: [bg, text],
            y: screenH + 30,
            duration: 300,
            ease: "Power2",
            onComplete: () => {
              bg.destroy();
              text.destroy();
              this.showNextNotification();
            },
          });
        });
      },
    });

    this.checkPendingAchievements();
  }
}
