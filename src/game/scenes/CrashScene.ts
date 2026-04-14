import { Scene } from 'phaser';
import { GameState } from '../GameState';

export class CrashScene extends Scene {
    constructor() {
        super('CrashScene');
    }

    create() {
        const cx = 360;
        const run = GameState.lastRun;
        const isNewHighscore = run.score >= GameState.highscore && run.score > 0;

        this.add.text(cx, 200, 'CRASH!', {
            fontSize: '64px', color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Stats
        this.add.text(cx, 380, `MAX ALTITUDE: ${run.altitude}`, {
            fontSize: '28px', color: '#ffffff', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add.text(cx, 430, `GEARS COLLECTED: ${run.gears}`, {
            fontSize: '28px', color: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add.text(cx, 500, `SCORE: ${run.score}`, {
            fontSize: '36px', color: '#4a9eff', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);

        if (isNewHighscore) {
            this.add.text(cx, 560, 'NEW HIGHSCORE!', {
                fontSize: '32px', color: '#ff6b35', fontFamily: 'monospace', fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        this.add.text(cx, 620, `HIGHSCORE: ${GameState.highscore}`, {
            fontSize: '22px', color: '#aaaaaa', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add.text(cx, 680, `WALLET: ${GameState.currency}G`, {
            fontSize: '22px', color: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Buttons
        const rebuildBtn = this.add.text(cx, 850, '[ REBUILD ]', {
            fontSize: '40px', color: '#4a9eff', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        rebuildBtn.on('pointerover', () => rebuildBtn.setColor('#ffffff'));
        rebuildBtn.on('pointerout', () => rebuildBtn.setColor('#4a9eff'));
        rebuildBtn.on('pointerdown', () => this.scene.start('BuildScene'));

        const menuBtn = this.add.text(cx, 950, '[ MENU ]', {
            fontSize: '32px', color: '#888888', fontFamily: 'monospace'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
        menuBtn.on('pointerout', () => menuBtn.setColor('#888888'));
        menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}
