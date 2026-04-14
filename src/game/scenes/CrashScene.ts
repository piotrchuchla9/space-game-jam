import { Scene, Math as PhaserMath } from 'phaser';
import { GameState } from '../GameState';
import { getAchievementName } from '../systems/AchievementManager';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { flashShake, warpOut } from '../ui/SceneTransition';
import { title, label, panel } from '../ui/typography';
import { burst } from '../ui/Confetti';
import { COLORS, HEX } from '../ui/colors';

export class CrashScene extends Scene {
    constructor() {
        super('CrashScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        const cx = 360;
        const run = GameState.lastRun;
        const isNewHighscore = run.score >= GameState.highscore && run.score > 0;

        const starfield = new StarfieldBackground(this, { density: 0.6 });
        starfield.addAccent('meteor');

        const content = this.add.container(0, 0);
        content.setAlpha(0);

        flashShake(this, () => {
            this.tweens.add({ targets: content, alpha: 1, duration: 400 });
        });

        const wreck = this.add.image(cx, 320, 'rocket').setAngle(-40).setScale(0.9);
        content.add(wreck);

        const crashTitle = title(this, cx, 220, 'CRASH!', 84, { color: HEX.accentPink, strokeThickness: 9 });
        crashTitle.setScale(0);
        this.tweens.add({
            targets: crashTitle, scale: 1, duration: 500, ease: 'Back.easeOut',
            onComplete: () => this.cameras.main.shake(200, 0.005),
        });
        content.add(crashTitle);
        for (let i = 0; i < 8; i++) {
            const p = this.add.circle(cx + PhaserMath.Between(-40, 40), 330, 4, COLORS.accentLilac, 0.8);
            this.tweens.add({
                targets: p, y: 250 - i * 20, alpha: 0, duration: 1800 + i * 120,
                onComplete: () => p.destroy(),
            });
            content.add(p);
        }

        const statsPanel = panel(this, cx, 600, 560, 360);
        content.add(statsPanel);

        const altText = label(this, cx - 220, 460, 'MAX ALTITUDE: 0', 22, { color: HEX.paper, bold: true, strokeThickness: 3 }).setOrigin(0, 0.5);
        content.add(altText);
        this.tweens.addCounter({
            from: 0, to: run.altitude, duration: 800,
            onUpdate: tw => altText.setText(`MAX ALTITUDE: ${Math.round(tw.getValue() ?? 0)}`),
        });

        const gearsText = label(this, cx - 220, 510, 'GEARS COLLECTED: 0', 22, { color: HEX.accentWarm, bold: true, strokeThickness: 3 }).setOrigin(0, 0.5);
        content.add(gearsText);
        this.tweens.addCounter({
            from: 0, to: run.gears, duration: 800,
            onUpdate: tw => gearsText.setText(`GEARS COLLECTED: ${Math.round(tw.getValue() ?? 0)}`),
        });

        const timeText = label(this, cx - 220, 560, 'TIME: 0.00 s', 22, { color: HEX.accentCyan, bold: true, strokeThickness: 3 }).setOrigin(0, 0.5);
        content.add(timeText);
        this.tweens.addCounter({
            from: 0, to: run.time, duration: 800,
            onUpdate: tw => timeText.setText(`TIME: ${(tw.getValue() ?? 0).toFixed(2)} s`),
        });

        const sep = this.add.graphics();
        sep.lineStyle(2, COLORS.ink, 1);
        for (let x = cx - 220; x < cx + 220; x += 14) {
            sep.lineBetween(x, 600, x + 8, 600);
        }
        content.add(sep);

        const scoreText = label(this, cx, 650, 'SCORE: 0', 40, { color: HEX.accentCyan, bold: true, strokeThickness: 5 });
        content.add(scoreText);
        this.tweens.addCounter({
            from: 0, to: run.score, duration: 1200,
            onUpdate: tw => scoreText.setText(`SCORE: ${Math.round(tw.getValue() ?? 0)}`),
        });

        const hsText = label(this, cx - 220, 700, `HIGHSCORE: ${GameState.highscore}`, 18, {
            color: HEX.accentLilac, strokeThickness: 0,
        }).setOrigin(0, 0.5);
        const walletText = label(this, cx + 220, 700, `${GameState.currency}G`, 18, {
            color: HEX.accentWarm, bold: true, strokeThickness: 3,
        }).setOrigin(1, 0.5);
        content.add([hsText, walletText]);

        if (isNewHighscore) {
            this.time.delayedCall(1300, () => {
                const chip = label(this, cx, 750, '★ NEW HIGHSCORE ★', 24, {
                    color: HEX.accentWarm, bold: true, strokeThickness: 4,
                });
                chip.setScale(0);
                this.tweens.add({ targets: chip, scale: 1, duration: 400, ease: 'Back.easeOut' });
                burst(this, cx, 750, { count: 40, spread: 300 });
                content.add(chip);
            });
        }

        const rebuild = new CartoonButton(this, cx, 890, '▲ REBUILD', {
            variant: 'primary', width: 320, height: 88, fontSize: 32, wobble: true,
            onClick: () => { this.playClick(); warpOut(this, () => this.scene.start('BuildScene')); },
        });
        content.add(rebuild.container);

        const menu = new CartoonButton(this, cx, 1000, 'MENU', {
            variant: 'ghost', width: 200, height: 60, fontSize: 22,
            onClick: () => { this.playClick(); warpOut(this, () => this.scene.start('MenuScene')); },
        });
        content.add(menu.container);

        if (GameState.pendingAchievementNotifications.length > 0) {
            const unlocked = [...GameState.pendingAchievementNotifications];
            GameState.pendingAchievementNotifications = [];
            unlocked.forEach((id, i) => this.showAchievementToast(id, i));
        }
    }

    private showAchievementToast(achievementId: string, index: number) {
        const cx = 360;
        const screenH = this.cameras.main.height;
        const bannerY = screenH + 40;
        const targetY = screenH - 80 - index * 80;
        const name = getAchievementName(achievementId);

        const bg = this.add.nineslice(cx, bannerY, 'ui_panel', 0, 520, 60, 16, 16, 16, 16).setOrigin(0.5);
        const star = this.add.text(cx - 230, bannerY, '★', {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '28px',
            color: HEX.accentWarm,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(0.5);
        const text = this.add.text(cx + 20, bannerY, `ACHIEVEMENT: ${name}`, {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '18px',
            color: HEX.accentWarm,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: [bg, star, text],
            y: targetY,
            duration: 500,
            delay: index * 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                burst(this, cx, targetY, { count: 20 });
                this.tweens.add({ targets: star, rotation: Math.PI * 2, duration: 3000, repeat: -1 });
            },
        });
        this.time.delayedCall(3500 + index * 200, () => {
            this.tweens.add({
                targets: [bg, star, text], alpha: 0, duration: 500,
                onComplete: () => { bg.destroy(); star.destroy(); text.destroy(); },
            });
        });
    }
}
