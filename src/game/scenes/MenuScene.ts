import { Math as PhaserMath, Scene, GameObjects } from 'phaser';
import { GameState } from '../GameState';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut } from '../ui/SceneTransition';
import { title, label, panel } from '../ui/typography';
import { COLORS, HEX } from '../ui/colors';

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

        const rocket = this.add.image(cx, 280, 'rocket').setScale(1.2);
        this.tweens.add({
            targets: rocket,
            y: 272,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut',
        });
        this.add.particles(cx, 360, 'gear', {
            speed: { min: 30, max: 80 },
            lifespan: 600,
            scale: { start: 0.1, end: 0 },
            tint: COLORS.accentCyan,
            frequency: 100,
            blendMode: 'ADD',
        }).setDepth(rocket.depth - 1);

        const t = title(this, cx, 540, 'ROCKET\nBUILDER', 72, {
            color: HEX.accentCyan, strokeThickness: 8, rotation: -0.03,
        });
        t.setScale(0).setAlign('center');
        this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });

        panel(this, cx, 670, 300, 56);
        const hs = label(this, cx, 670, `★ HIGHSCORE: ${GameState.highscore}`, 22, {
            color: HEX.accentWarm, bold: true, strokeThickness: 3,
        });
        if (GameState.highscore > 0) {
            this.tweens.add({ targets: hs, scale: 1.08, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }

        new CartoonButton(this, cx, 810, 'PLAY', {
            variant: 'primary', width: 300, height: 88, fontSize: 40, wobble: true,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('BuildScene'));
            },
        });

        new CartoonButton(this, cx, 920, 'ACHIEVEMENTS', {
            variant: 'secondary', width: 260, height: 64, fontSize: 22,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('AchievementsScene'));
            },
        });

        new CartoonButton(this, cx, 995, 'HOW TO PLAY', {
            variant: 'ghost', width: 260, height: 52, fontSize: 22,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('InstructionScene'));
            },
        });

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

        label(this, cx, 1245, 'MACHINES JAM 2026', 16, { color: HEX.accentLilac, strokeThickness: 0 });

        warpIn(this);
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
