import { Scene } from 'phaser';
import { COLORS } from '../ui/colors';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        this.load.image('rocket', 'assets/rocket.png');
        for (let i = 1; i <= 31; i++) {
            const key = `rp_${String(i).padStart(3, '0')}`;
            this.load.image(key, `assets/parts/rp_${String(i).padStart(3, '0')}.png`);
        }
        this.load.image('gear', 'assets/gear.png');
        this.load.image('ground', 'assets/ground.png');
        this.load.image('canister', 'assets/canister.png');
        this.load.image('bird', 'assets/bird.png');
        for (let i = 0; i <= 9; i++) {
            const key = `planet${String(i).padStart(2, '0')}`;
            this.load.image(key, `assets/planets/${key}.png`);
        }
        this.load.image('station', 'assets/station_005.png');
        this.load.image('ui_panel', 'assets/ui_panel.png');
        this.load.image('ui_slide_track', 'assets/ui_slide_track.png');
        this.load.image('ui_slide_fill', 'assets/ui_slide_fill.png');

        this.load.audio('soundtrack', 'assets/soundtrack.mp3');
        this.load.audio('click', 'assets/click.mp3');
        this.load.audio('buy', 'assets/buy.mp3');
        this.load.audio('error', 'assets/error.mp3');
        this.load.audio('build', 'assets/build.mp3');
        this.load.audio('fuel', 'assets/fuel.mp3');
        this.load.audio('fuelAlert', 'assets/fuelAlert.mp3');
        this.load.audio('gear_sfx', 'assets/gear.mp3');
        this.load.audio('explosion', 'assets/explosionCrunch.ogg');
        this.load.audio('thruster', 'assets/thrusterFire.ogg');
    }

    create() {
        this.cameras.main.setBackgroundColor(COLORS.bgDeep);
        this.add.text(360, 640, 'LOADING', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'monospace',
        }).setOrigin(0.5);

        const go = () => this.scene.start('MenuScene');
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
        if (fonts && fonts.load) {
            fonts.load('16px KenneyFuture').then(go).catch(go);
        } else {
            go();
        }
    }
}
