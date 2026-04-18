import { Scene, GameObjects } from "phaser";
import { GameState } from "../GameState";
import { getAchievementName } from "../systems/AchievementManager";
import { Minimap } from "../ui/Minimap";
import type { MinimapItem } from "../systems/ZoneManager";

const FONT = "KenneyFuture";

export class HUDScene extends Scene {
  private altText!: GameObjects.Text;
  private spdText!: GameObjects.Text;
  private timeText!: GameObjects.Text;
  private zoneText!: GameObjects.Text;
  private gearText!: GameObjects.Text;
  private fuelFill!: GameObjects.Rectangle;
  private notificationQueue: string[] = [];
  private isShowingNotification: boolean = false;
  private hudUpdateHandler?: Function;
  private minimap!: Minimap;
  private minimapUpdateHandler?: Function;

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
      .image(90, 62, "ui_panel")
      .setDisplaySize(160, 104)
      .setAlpha(0.75)
      .setOrigin(0.5, 0.5);

    this.altText = this.add.text(16, 12, "ALT: 0", {
      fontSize: "18px",
      color: "#000000",
      fontFamily: FONT,
    });

    this.spdText = this.add.text(16, 34, "SPD: 0", {
      fontSize: "18px",
      color: "#000000",
      fontFamily: FONT,
    });

    this.timeText = this.add.text(16, 56, "TIME: 0.00 s", {
      fontSize: "16px",
      color: "#000000",
      fontFamily: FONT,
    });

    this.zoneText = this.add.text(16, 80, "ATMOSPHERE", {
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

    // Minimap — prawy górny róg pod panelem FUEL
    this.minimap = new Minimap(this, 614, 150, 120, 180, 1000);

    // Self-destruct button (bottom-right)
    const flightScene = this.scene.get("FlightScene");
    const sdBg = this.add
      .rectangle(640, 1230, 130, 50, 0xaa0000)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(640, 1230, "SELF\nDESTRUCT", {
        fontSize: "14px",
        color: "#ffffff",
        fontFamily: FONT,
        align: "center",
      })
      .setOrigin(0.5);
    sdBg.on("pointerover", () => sdBg.setFillStyle(0xff2222));
    sdBg.on("pointerout", () => sdBg.setFillStyle(0xaa0000));
    sdBg.on("pointerdown", () => flightScene.events.emit("selfDestruct"));
    this.hudUpdateHandler = (data: {
      altitude: number;
      fuel: number;
      maxFuel: number;
      zone: string;
      gears: number;
      speed: number;
      time: number;
    }) => {
      this.altText.setText(`ALT: ${data.altitude}`);
      this.spdText.setText(`SPD: ${data.speed}`);
      this.timeText.setText(`TIME: ${data.time.toFixed(2)} s`);
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

    this.minimapUpdateHandler = (data: {
      rocketX: number;
      rocketY: number;
      items: MinimapItem[];
    }) => {
      this.minimap.update(data.rocketX, data.rocketY, data.items);
    };
    flightScene.events.on("updateMinimap", this.minimapUpdateHandler, this);

    const endgameHandler = (data?: { time?: number }) =>
      this.showEndgameOverlay(data?.time ?? 0);
    flightScene.events.on("endgameReached", endgameHandler, this);

    // Clean up the cross-scene listener when this scene shuts down
    this.events.on("shutdown", () => {
      flightScene.events.off("updateHUD", this.hudUpdateHandler as Function, this);
      flightScene.events.off("updateMinimap", this.minimapUpdateHandler as Function, this);
      flightScene.events.off("endgameReached", endgameHandler, this);
      this.minimap?.destroy();
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

  private showEndgameOverlay(timeSeconds: number) {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 - 80;

    const backdrop = this.add
      .rectangle(cx, cy, 680, 300, 0x000000, 0.45)
      .setStrokeStyle(2, 0xffcc00);

    const title = this.add
      .text(cx, cy - 100, "CONGRATULATIONS!", {
        fontSize: "40px",
        color: "#ffcc00",
        fontFamily: FONT,
        stroke: "#0a0a1e",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5);

    const line2 = this.add
      .text(cx, cy - 40, "YOU HAVE REACHED THE MOON", {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: FONT,
        stroke: "#0a0a1e",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5);

    const timeText = this.add
      .text(cx, cy + 10, `TIME: ${timeSeconds.toFixed(2)} s`, {
        fontSize: "26px",
        color: "#ffcc00",
        fontFamily: FONT,
        stroke: "#0a0a1e",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5);

    const line3 = this.add
      .text(cx, cy + 70, "KEEP GRINDING", {
        fontSize: "28px",
        color: "#4ad8ff",
        fontFamily: FONT,
        stroke: "#0a0a1e",
        strokeThickness: 5,
        align: "center",
      })
      .setOrigin(0.5);

    const group = [backdrop, title, line2, timeText, line3];
    group.forEach((g) => g.setAlpha(0));

    this.tweens.add({
      targets: group,
      alpha: 1,
      duration: 700,
      ease: "Sine.easeOut",
    });

    const pulse = this.tweens.add({
      targets: title,
      scale: { from: 1, to: 1.06 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: group,
        alpha: 0,
        duration: 600,
        ease: "Sine.easeIn",
        onComplete: () => {
          pulse.stop();
          group.forEach((g) => g.destroy());
        },
      });
    });
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
