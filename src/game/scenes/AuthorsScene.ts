import { Scene } from 'phaser';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut } from '../ui/SceneTransition';
import { title, label } from '../ui/typography';
import { COLORS, HEX } from '../ui/colors';
import { GameState } from '../GameState';

interface Author {
    name: string;
    github: string;
    url: string;
    color: number;
    colorHex: string;
}

const AUTHORS: Author[] = [
    {
        name: 'Piotr Chuchla',
        github: 'piotrchuchla9',
        url: 'https://github.com/piotrchuchla9',
        color: COLORS.accentCyan,
        colorHex: HEX.accentCyan,
    },
    {
        name: 'Miłosz Zajonc',
        github: 'ZajoncM',
        url: 'https://github.com/ZajoncM',
        color: COLORS.accentPink,
        colorHex: HEX.accentPink,
    },
];

export class AuthorsScene extends Scene {
    constructor() {
        super('AuthorsScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        const cx = 360;

        new StarfieldBackground(this, { density: 0.7 });

        const t = title(this, cx, 120, 'AUTHORS', 52, {
            color: HEX.accentWarm,
            strokeThickness: 7,
        });
        t.setScale(0);
        this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });

        label(this, cx, 200, 'MACHINES JAM 2026', 18, { color: HEX.accentLilac, strokeThickness: 0 });

        let cursorY = 270;

        AUTHORS.forEach((author, i) => {
            const cardH = 130;

            // Card background
            const g = this.add.graphics();
            g.fillStyle(COLORS.bgMid, 0.5);
            g.fillRoundedRect(60, cursorY, 600, cardH, 16);
            g.lineStyle(3, author.color, 0.85);
            g.strokeRoundedRect(60, cursorY, 600, cardH, 16);

            // Avatar circle
            const av = this.add.graphics();
            av.fillStyle(author.color, 0.25);
            av.fillCircle(130, cursorY + 65, 38);
            av.lineStyle(3, author.color, 0.9);
            av.strokeCircle(130, cursorY + 65, 38);

            const initials = author.name
                .split(' ')
                .map((w) => w[0])
                .join('');
            this.add.text(130, cursorY + 65, initials, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '24px',
                color: author.colorHex,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0.5);

            // Name
            this.add.text(190, cursorY + 42, author.name, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '22px',
                color: HEX.paper,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0, 0.5);

            // GitHub link
            const linkText = this.add.text(190, cursorY + 84, `github.com/${author.github}`, {
                fontFamily: '"Trebuchet MS", sans-serif',
                fontSize: '17px',
                color: author.colorHex,
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

            // Underline on hover
            linkText.on('pointerover', () => {
                linkText.setStyle({ color: HEX.paper });
            });
            linkText.on('pointerout', () => {
                linkText.setStyle({ color: author.colorHex });
            });
            linkText.on('pointerdown', () => {
                this.playClick();
                window.open(author.url, '_blank');
            });

            // Animate card in
            const delay = i * 150;
            ([g, av] as Phaser.GameObjects.GameObject[]).forEach((obj) => {
                obj.setAlpha(0);
                this.tweens.add({ targets: obj, alpha: 1, delay, duration: 350, ease: 'Power2' });
            });

            cursorY += cardH + 20;
        });

        const btnY = cursorY + 80;

        new CartoonButton(this, cx, btnY, '< BACK', {
            variant: 'ghost', width: 300, height: 64, fontSize: 24,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('MenuScene'));
            },
        });

        warpIn(this);
    }
}
