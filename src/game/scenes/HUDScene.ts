import { Scene, GameObjects } from 'phaser';

export class HUDScene extends Scene {
    private altText!: GameObjects.Text;
    private zoneText!: GameObjects.Text;
    private fuelBar!: GameObjects.Rectangle;
    private gearText!: GameObjects.Text;

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

        // Gear counter — top center
        this.gearText = this.add.text(360, 20, 'GEARS: 0', {
            fontSize: '22px', color: '#ffcc00', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5, 0);

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
            gears: number;
        }) => {
            this.altText.setText(`ALT: ${data.altitude}`);
            this.zoneText.setText(data.zone);
            this.gearText.setText(`GEARS: ${data.gears}`);

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
    }
}
