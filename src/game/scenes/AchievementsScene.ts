import { Scene } from 'phaser';
import { GameState } from '../GameState';
import { ACHIEVEMENTS } from '../systems/AchievementManager';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut } from '../ui/SceneTransition';
import { title, label, panel } from '../ui/typography';
import { COLORS, HEX } from '../ui/colors';

export class AchievementsScene extends Scene {
    constructor() {
        super('AchievementsScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        const cx = 360;

        const starfield = new StarfieldBackground(this, { density: 0.8 });
        starfield.addAccent('constellations');

        const t = title(this, cx, 90, 'ACHIEVEMENTS', 56, { color: HEX.accentWarm, strokeThickness: 7 });
        t.setScale(0);
        this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });

        const unlockedCount = GameState.unlockedAchievements.length;
        panel(this, cx, 160, 280, 48);
        const counter = label(this, cx, 160, `0 / ${ACHIEVEMENTS.length} UNLOCKED`, 20, {
            color: HEX.accentWarm, bold: true, strokeThickness: 3,
        });
        this.tweens.addCounter({
            from: 0,
            to: unlockedCount,
            duration: 600,
            onUpdate: tween => counter.setText(`${Math.round(tween.getValue() ?? 0)} / ${ACHIEVEMENTS.length} UNLOCKED`),
        });

        const startY = 240;
        const spacing = 110;

        ACHIEVEMENTS.forEach((ach, i) => {
            const y = startY + i * spacing;
            const unlocked = GameState.unlockedAchievements.includes(ach.id);

            const card = this.add.container(800, y);
            const bgColor = unlocked ? COLORS.paper : COLORS.bgMid;
            const bgAlpha = unlocked ? 0.12 : 0.4;

            const g = this.add.graphics();
            g.fillStyle(bgColor, bgAlpha);
            g.fillRoundedRect(-300, -45, 600, 90, 16);
            g.lineStyle(4, COLORS.ink, 1);
            g.strokeRoundedRect(-300, -45, 600, 90, 16);
            card.add(g);

            if (unlocked) {
                const star = this.add.text(-250, 0, '★', {
                    fontFamily: 'KenneyFuture, sans-serif',
                    fontSize: '48px',
                    color: HEX.accentWarm,
                    stroke: HEX.ink,
                    strokeThickness: 4,
                }).setOrigin(0.5);
                this.tweens.add({ targets: star, rotation: Math.PI * 2, duration: 20000, repeat: -1 });
                card.add(star);
            } else {
                const lock = this.add.text(-250, 0, '■', {
                    fontFamily: 'KenneyFuture, sans-serif',
                    fontSize: '40px',
                    color: HEX.accentLilac,
                    stroke: HEX.ink,
                    strokeThickness: 3,
                }).setOrigin(0.5);
                card.add(lock);
            }

            const nameText = this.add.text(-200, -14, ach.name, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '22px',
                color: unlocked ? HEX.paper : HEX.accentLilac,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0, 0.5);
            card.add(nameText);

            const desc = ach.gearsThreshold !== undefined
                ? `Collect ${ach.gearsThreshold.toLocaleString()} gears in one flight`
                : `Reach ${ach.altitudeThreshold!.toLocaleString()} altitude`;
            const descText = this.add.text(-200, 18, desc, {
                fontFamily: '"Trebuchet MS", sans-serif',
                fontSize: '14px',
                color: unlocked ? HEX.accentLilac : '#888',
            }).setOrigin(0, 0.5);
            card.add(descText);

            this.tweens.add({
                targets: card,
                x: cx,
                delay: i * 80,
                duration: 400,
                ease: 'Back.easeOut',
            });
        });

        new CartoonButton(this, cx, 1180, '< BACK', {
            variant: 'ghost', width: 220, height: 64, fontSize: 24,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('MenuScene'));
            },
        });

        warpIn(this);
    }
}
