import { Scene } from 'phaser';
import { GameState } from '../GameState';

export class MenuScene extends Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const cx = 360;

        this.add.text(cx, 300, 'ROCKET\nBUILDER', {
            fontSize: '72px',
            color: '#ff6b35',
            fontFamily: 'monospace',
            align: 'center',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.text(cx, 500, `HIGHSCORE: ${GameState.highscore}`, {
            fontSize: '28px',
            color: '#aaaaaa',
            fontFamily: 'monospace',
        }).setOrigin(0.5);

        const playBtn = this.add.text(cx, 700, '[ PLAY ]', {
            fontSize: '48px',
            color: '#4a9eff',
            fontFamily: 'monospace',
            fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        playBtn.on('pointerover', () => playBtn.setColor('#ffffff'));
        playBtn.on('pointerout', () => playBtn.setColor('#4a9eff'));
        playBtn.on('pointerdown', () => {
            this.scene.start('BuildScene');
        });

        this.add.text(cx, 1100, 'MACHINES JAM 2026', {
            fontSize: '20px',
            color: '#666666',
            fontFamily: 'monospace',
        }).setOrigin(0.5);
    }
}
