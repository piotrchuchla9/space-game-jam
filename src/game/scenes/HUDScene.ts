import { Scene, GameObjects } from 'phaser';
import { GameState } from '../GameState';
import { getAchievementName } from '../systems/AchievementManager';

export class HUDScene extends Scene {
    private altText!: GameObjects.Text;
    private zoneText!: GameObjects.Text;
    private fuelBar!: GameObjects.Rectangle;
    private notificationQueue: string[] = [];
    private isShowingNotification: boolean = false;

    constructor() {
        super('HUDScene');
    }

    create() {
        // Altitude — top left
        this.altText = this.add.text(20, 20, 'ALT: 0', {
            fontSize: '28px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
        });

        this.zoneText = this.add.text(20, 55, 'ATMOSPHERE', {
            fontSize: '18px', color: '#88aaff', fontFamily: 'monospace'
        });

        // Fuel bar — top right
        this.add.text(700, 20, 'FUEL', {
            fontSize: '18px', color: '#aaaaaa', fontFamily: 'monospace'
        }).setOrigin(1, 0);

        this.add.rectangle(570, 50, 130, 16, 0x333333).setOrigin(0, 0.5);
        this.fuelBar = this.add.rectangle(570, 50, 130, 16, 0x44ff44).setOrigin(0, 0.5);

        // Listen for updates from FlightScene
        const flightScene = this.scene.get('FlightScene');
        flightScene.events.on('updateHUD', (data: {
            altitude: number;
            fuel: number;
            maxFuel: number;
            zone: string;
        }) => {
            this.altText.setText(`ALT: ${data.altitude}`);
            this.zoneText.setText(data.zone);

            const fuelPct = Math.max(0, data.fuel / data.maxFuel);
            this.fuelBar.setSize(130 * fuelPct, 16);
            this.fuelBar.setFillStyle(fuelPct > 0.3 ? 0x44ff44 : 0xff4444);

            // Zone color
            const zoneColors: Record<string, string> = {
                'ATMOSPHERE': '#88aaff',
                'TURBULENCE': '#ff8844',
                'SPACE': '#cc88ff',
            };
            this.zoneText.setColor(zoneColors[data.zone] ?? '#88aaff');
        });

        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (GameState.pendingAchievementNotifications.length > 0) {
                    this.notificationQueue.push(...GameState.pendingAchievementNotifications);
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

        const bg = this.add.rectangle(360, bannerY, 400, 50, 0x000000, 0.8)
            .setStrokeStyle(1, 0xffcc00);

        const text = this.add.text(360, bannerY, `ACHIEVEMENT: ${name}`, {
            fontSize: '16px',
            color: '#ffcc00',
            fontFamily: 'monospace',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Slide in from bottom
        this.tweens.add({
            targets: [bg, text],
            y: targetY,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold for 3 seconds, then slide out
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: [bg, text],
                        y: screenH + 30,
                        duration: 300,
                        ease: 'Power2',
                        onComplete: () => {
                            bg.destroy();
                            text.destroy();
                            this.showNextNotification();
                        },
                    });
                });
            },
        });
    }
}
