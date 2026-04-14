import { Scene } from 'phaser';
import { GameState } from '../GameState';
import { ACHIEVEMENTS } from '../systems/AchievementManager';

export class AchievementsScene extends Scene {
    constructor() {
        super('AchievementsScene');
    }

    create() {
        const cx = 360;

        this.add.text(cx, 80, 'ACHIEVEMENTS', {
            fontSize: '42px',
            color: '#ffcc00',
            fontFamily: 'monospace',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        const startY = 200;
        const spacing = 100;

        for (let i = 0; i < ACHIEVEMENTS.length; i++) {
            const ach = ACHIEVEMENTS[i];
            const y = startY + i * spacing;
            const unlocked = GameState.unlockedAchievements.includes(ach.id);

            // Icon
            this.add.text(120, y, unlocked ? '★' : '☆', {
                fontSize: '36px',
                color: unlocked ? '#ffcc00' : '#444444',
                fontFamily: 'monospace',
            }).setOrigin(0.5);

            // Name
            this.add.text(160, y - 12, ach.name, {
                fontSize: '22px',
                color: unlocked ? '#ffffff' : '#555555',
                fontFamily: 'monospace',
                fontStyle: unlocked ? 'bold' : 'normal',
            }).setOrigin(0, 0.5);

            // Threshold
            const desc = ach.gearsThreshold !== undefined
                ? `Collect ${ach.gearsThreshold.toLocaleString()} gears in one flight`
                : `Reach ${ach.altitudeThreshold!.toLocaleString()} altitude`;
            this.add.text(160, y + 16, desc, {
                fontSize: '14px',
                color: unlocked ? '#88aaff' : '#333333',
                fontFamily: 'monospace',
            }).setOrigin(0, 0.5);

            // Separator line
            if (i < ACHIEVEMENTS.length - 1) {
                this.add.rectangle(cx, y + spacing / 2, 500, 1, unlocked ? 0x333333 : 0x222222);
            }
        }

        // Back button
        const backBtn = this.add.text(cx, 1100, '[ BACK ]', {
            fontSize: '32px',
            color: '#888888',
            fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
        backBtn.on('pointerout', () => backBtn.setColor('#888888'));
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}
