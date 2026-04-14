import { Math as PhaserMath, Scene } from 'phaser';
import { GameState } from '../GameState';

export class MenuScene extends Scene {
    private soundtrack!: Phaser.Sound.BaseSound;

    constructor() {
        super('MenuScene');
    }

    preload() {
        this.load.audio('soundtrack', 'assets/soundtrack.mp3');
        this.load.audio('click', 'assets/click.mp3');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        this.soundtrack = this.sound.add('soundtrack', { loop: true, volume: GameState.getMusicVolume() });
        this.soundtrack.play();

        this.events.on('shutdown', () => {
            this.soundtrack.stop();
        });

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
            this.playClick();
            this.scene.start('BuildScene');
        });

        const achBtn = this.add.text(cx, 780, '[ ACHIEVEMENTS ]', {
            fontSize: '28px',
            color: '#ffcc00',
            fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        achBtn.on('pointerover', () => achBtn.setColor('#ffffff'));
        achBtn.on('pointerout', () => achBtn.setColor('#ffcc00'));
        achBtn.on('pointerdown', () => {
            this.playClick();
            this.scene.start('AchievementsScene');
        });

        // --- Sound controls ---
        this.createVolumeControl(cx, 880, 'MUSIC', GameState.musicVolume, GameState.musicMuted,
            (vol) => {
                GameState.musicVolume = vol;
                (this.soundtrack as any).setVolume(GameState.getMusicVolume());
                GameState.save();
            },
            (muted) => {
                GameState.musicMuted = muted;
                (this.soundtrack as any).setVolume(GameState.getMusicVolume());
                GameState.save();
            }
        );

        this.createVolumeControl(cx, 960, 'SFX', GameState.sfxVolume, GameState.sfxMuted,
            (vol) => {
                GameState.sfxVolume = vol;
                GameState.save();
            },
            (muted) => {
                GameState.sfxMuted = muted;
                GameState.save();
            }
        );

        this.add.text(cx, 1100, 'MACHINES JAM 2026', {
            fontSize: '20px',
            color: '#666666',
            fontFamily: 'monospace',
        }).setOrigin(0.5);
    }

    private createVolumeControl(
        cx: number, y: number, label: string,
        initialVolume: number, initialMuted: boolean,
        onVolumeChange: (vol: number) => void,
        onMuteToggle: (muted: boolean) => void,
    ) {
        let volume = initialVolume;
        let muted = initialMuted;

        // Label
        this.add.text(cx - 160, y, label, {
            fontSize: '18px',
            color: '#aaaaaa',
            fontFamily: 'monospace',
        }).setOrigin(0, 0.5);

        // Slider track
        const trackX = cx - 40;
        const trackW = 200;
        const trackH = 8;
        this.add.rectangle(trackX, y, trackW, trackH, 0x333333).setOrigin(0, 0.5);

        // Slider fill
        const fill = this.add.rectangle(trackX, y, trackW * volume, trackH, 0x4a9eff).setOrigin(0, 0.5);

        // Slider handle
        const handle = this.add.circle(trackX + trackW * volume, y, 12, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);
        this.input.setDraggable(handle);

        // Hit zone for clicking on track
        const hitZone = this.add.rectangle(trackX, y, trackW, 30, 0x000000, 0)
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.playClick();
            const localX = pointer.x - trackX;
            volume = PhaserMath.Clamp(localX / trackW, 0, 1);
            handle.setX(trackX + trackW * volume);
            fill.setSize(trackW * volume, trackH);
            onVolumeChange(volume);
        });

        this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number) => {
            if (gameObject !== handle) return;
            const clampedX = PhaserMath.Clamp(dragX, trackX, trackX + trackW);
            handle.setX(clampedX);
            volume = (clampedX - trackX) / trackW;
            fill.setSize(trackW * volume, trackH);
            onVolumeChange(volume);
        });

        // Mute button
        const muteBtn = this.add.text(trackX + trackW + 30, y, muted ? 'OFF' : 'ON', {
            fontSize: '18px',
            color: muted ? '#ff4444' : '#44ff44',
            fontFamily: 'monospace',
            fontStyle: 'bold',
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

        muteBtn.on('pointerdown', () => {
            this.playClick();
            muted = !muted;
            muteBtn.setText(muted ? 'OFF' : 'ON');
            muteBtn.setColor(muted ? '#ff4444' : '#44ff44');
            onMuteToggle(muted);
        });
    }
}
