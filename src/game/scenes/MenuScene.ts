import { Math as PhaserMath, Scene, GameObjects } from 'phaser';
import { GameState } from '../GameState';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut } from '../ui/SceneTransition';
import { title, label, panel } from '../ui/typography';
import { COLORS, HEX } from '../ui/colors';

const CHEAT_TOOLTIP = [
    'CHEAT MODE:',
    '- unlimited gears / all parts',
    '- build any rocket setup',
    '- no gears earned in flight',
    '- excluded from achievements',
    '- excluded from leaderboards',
].join('\n');

export class MenuScene extends Scene {
    private soundtrack!: Phaser.Sound.BaseSound;

    constructor() {
        super('MenuScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        this.soundtrack = this.sound.add('soundtrack', { loop: true, volume: GameState.getMusicVolume() });
        this.soundtrack.play();
        this.events.on('shutdown', () => this.soundtrack.stop());

        const starfield = new StarfieldBackground(this);
        starfield.addAccent('planet');

        const cx = 360;

        const rocket = this.add.image(cx, 170, 'rocket').setScale(0.85);
        this.tweens.add({
            targets: rocket,
            y: 162,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut',
        });
        this.add.particles(cx, 250, 'gear', {
            speed: { min: 30, max: 80 },
            lifespan: 600,
            scale: { start: 0.1, end: 0 },
            tint: COLORS.accentCyan,
            frequency: 100,
            blendMode: 'ADD',
        }).setDepth(rocket.depth - 1);

        const t = title(this, cx, 430, 'ROCKET\nBUILDER', 72, {
            color: HEX.accentCyan, strokeThickness: 8, rotation: -0.03,
        });
        t.setScale(0).setAlign('center');
        this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });

        panel(this, cx, 560, 300, 56);
        const hs = label(this, cx, 560, `★ HIGHSCORE: ${GameState.highscore}`, 22, {
            color: HEX.accentWarm, bold: true, strokeThickness: 3,
        });
        if (GameState.highscore > 0) {
            this.tweens.add({ targets: hs, scale: 1.08, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }

        new CartoonButton(this, cx, 700, 'PLAY', {
            variant: 'primary', width: 300, height: 88, fontSize: 40, wobble: true,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('BuildScene'));
            },
        });

        new CartoonButton(this, cx, 810, 'ACHIEVEMENTS', {
            variant: 'secondary', width: 260, height: 64, fontSize: 22,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('AchievementsScene'));
            },
        });

        new CartoonButton(this, cx, 885, 'HOW TO PLAY', {
            variant: 'ghost', width: 260, height: 52, fontSize: 22,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('InstructionScene'));
            },
        });

        new CartoonButton(this, cx, 950, 'AUTHORS', {
            variant: 'ghost', width: 260, height: 52, fontSize: 22,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('AuthorsScene'));
            },
        });

        this.createCheatButton(cx, 1015);

        this.createVolumeControl(cx, 1075, 'MUSIC', GameState.musicVolume, GameState.musicMuted,
            (vol) => {
                GameState.musicVolume = vol;
                (this.soundtrack as unknown as { setVolume: (v: number) => void }).setVolume(GameState.getMusicVolume());
                GameState.save();
            },
            (muted) => {
                GameState.musicMuted = muted;
                (this.soundtrack as unknown as { setVolume: (v: number) => void }).setVolume(GameState.getMusicVolume());
                GameState.save();
            },
        );
        this.createVolumeControl(cx, 1155, 'SFX', GameState.sfxVolume, GameState.sfxMuted,
            (vol) => { GameState.sfxVolume = vol; GameState.save(); },
            (muted) => { GameState.sfxMuted = muted; GameState.save(); },
        );

        label(this, cx, 1230, 'GAMEDEV.JS JAM 2026 - MACHINES', 16, { color: HEX.accentLilac, strokeThickness: 0 });

        warpIn(this);
    }

    private createCheatButton(cx: number, y: number) {
        const tooltipBg = this.add.graphics().setDepth(100).setVisible(false);
        const tooltipText = this.add.text(cx, y - 130, CHEAT_TOOLTIP, {
            fontFamily: '"Trebuchet MS", sans-serif',
            fontSize: '14px',
            color: HEX.paper,
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5, 1).setDepth(101).setVisible(false);

        const drawTooltip = () => {
            const b = tooltipText.getBounds();
            const pad = 12;
            tooltipBg.clear();
            tooltipBg.fillStyle(COLORS.ink, 0.92);
            tooltipBg.fillRoundedRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2, 10);
            tooltipBg.lineStyle(3, COLORS.accentPink, 1);
            tooltipBg.strokeRoundedRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2, 10);
        };

        const btn = new CartoonButton(this, cx, y, GameState.cheatMode ? 'CHEAT: ON' : 'CHEAT', {
            variant: GameState.cheatMode ? 'danger' : 'ghost',
            width: 260, height: 52, fontSize: 22,
            onClick: () => {
                this.playClick();
                GameState.cheatMode = !GameState.cheatMode;
                GameState.save();
                warpOut(this, () => this.scene.start('MenuScene'));
            },
            onHover: () => {
                drawTooltip();
                tooltipBg.setVisible(true);
                tooltipText.setVisible(true);
            },
            onOut: () => {
                tooltipBg.setVisible(false);
                tooltipText.setVisible(false);
            },
        });
        void btn;
    }

    private createVolumeControl(
        cx: number, y: number, labelText: string,
        initialVolume: number, initialMuted: boolean,
        onVolumeChange: (vol: number) => void,
        onMuteToggle: (muted: boolean) => void,
    ) {
        let volume = initialVolume;
        let muted = initialMuted;

        label(this, cx - 180, y, labelText, 18, { color: HEX.accentLilac, strokeThickness: 0 }).setOrigin(0, 0.5);

        const trackX = cx - 60;
        const trackW = 220;
        this.add.image(trackX + trackW / 2, y, 'ui_slide_track').setDisplaySize(trackW, 14);
        const fill = this.add.image(trackX, y, 'ui_slide_fill').setOrigin(0, 0.5);
        fill.setDisplaySize(trackW * volume, 14);

        const handle = this.add.circle(trackX + trackW * volume, y, 14, COLORS.accentWarm)
            .setStrokeStyle(3, COLORS.ink)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);
        this.input.setDraggable(handle);

        const hitZone = this.add.rectangle(trackX, y, trackW, 40, 0, 0)
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.playClick();
            const localX = pointer.x - trackX;
            volume = PhaserMath.Clamp(localX / trackW, 0, 1);
            handle.setX(trackX + trackW * volume);
            fill.setDisplaySize(trackW * volume, 14);
            onVolumeChange(volume);
        });

        this.input.on('drag', (_p: Phaser.Input.Pointer, obj: GameObjects.GameObject, dragX: number) => {
            if (obj !== handle) return;
            const clamped = PhaserMath.Clamp(dragX, trackX, trackX + trackW);
            handle.setX(clamped);
            volume = (clamped - trackX) / trackW;
            fill.setDisplaySize(trackW * volume, 14);
            onVolumeChange(volume);
        });

        const toggle = new CartoonButton(this, trackX + trackW + 60, y, muted ? 'OFF' : 'ON', {
            variant: muted ? 'ghost' : 'secondary', width: 72, height: 36, fontSize: 16,
            onClick: () => {
                muted = !muted;
                toggle.setText(muted ? 'OFF' : 'ON');
                onMuteToggle(muted);
            },
        });
    }
}
