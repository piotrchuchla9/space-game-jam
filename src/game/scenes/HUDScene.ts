import { Scene, GameObjects } from 'phaser';

const FONT = 'KenneyFuture';

export class HUDScene extends Scene {
    private altText!: GameObjects.Text;
    private spdText!: GameObjects.Text;
    private zoneText!: GameObjects.Text;
    private gearText!: GameObjects.Text;
    private fuelFill!: GameObjects.Rectangle;

    constructor() {
        super('HUDScene');
    }

    preload() {
        this.load.font(FONT, 'assets/KenneyFuture.ttf');
        this.load.image('ui_panel', 'assets/ui_panel.png');
        this.load.image('ui_slide_track', 'assets/ui_slide_track.png');
        this.load.image('ui_slide_fill', 'assets/ui_slide_fill.png');
        this.load.image('gear', 'assets/gear.png');
    }

    create() {
        // --- Left panel: ALT + SPD + ZONE ---
        this.add.image(90, 52, 'ui_panel')
            .setDisplaySize(160, 80)
            .setAlpha(0.75)
            .setOrigin(0.5, 0.5);

        this.altText = this.add.text(16, 14, 'ALT: 0', {
            fontSize: '18px', color: '#000000', fontFamily: FONT
        });

        this.spdText = this.add.text(16, 38, 'SPD: 0', {
            fontSize: '18px', color: '#000000', fontFamily: FONT
        });

        this.zoneText = this.add.text(16, 60, 'ATMOSPHERE', {
            fontSize: '15px', color: '#000000', fontFamily: FONT
        });

        // --- Center panel: GEARS ---
        this.add.image(360, 30, 'ui_panel')
            .setDisplaySize(180, 44)
            .setAlpha(0.75)
            .setOrigin(0.5, 0.5);

        this.add.image(290, 30, 'gear')
            .setDisplaySize(24, 24)
            .setOrigin(0.5, 0.5);

        this.gearText = this.add.text(310, 18, '0', {
            fontSize: '18px', color: '#000000', fontFamily: FONT
        }).setOrigin(0, 0);

        // --- Right panel: FUEL bar ---
        this.add.image(614, 30, 'ui_panel')
            .setDisplaySize(160, 44)
            .setAlpha(0.75)
            .setOrigin(0.5, 0.5);

        this.add.text(540, 14, 'FUEL', {
            fontSize: '18px', color: '#000000', fontFamily: FONT
        });

        // Track (full width, static)
        this.add.rectangle(614, 36, 130, 14, 0x333333).setOrigin(0.5, 0.5);

        // Fill (grows from left)
        this.fuelFill = this.add.rectangle(549, 36, 130, 14, 0x44ff44).setOrigin(0, 0.5);

        // Listen for HUD updates from FlightScene
        const flightScene = this.scene.get('FlightScene');
        flightScene.events.on('updateHUD', (data: {
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
                'ATMOSPHERE': '#1144aa',
                'TURBULENCE': '#883300',
                'SPACE': '#440088',
            };
            this.zoneText.setText(data.zone);
            this.zoneText.setColor(zoneColors[data.zone] ?? '#000000');

            const pct = Math.max(0, data.fuel / data.maxFuel);
            this.fuelFill.setSize(130 * pct, 14);
            this.fuelFill.setFillStyle(pct > 0.3 ? 0x44ff44 : 0xff4444);
        });
    }
}
