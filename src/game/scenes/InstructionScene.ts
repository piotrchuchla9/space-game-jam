import { Scene } from 'phaser';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut } from '../ui/SceneTransition';
import { title } from '../ui/typography';
import { COLORS, HEX } from '../ui/colors';
import { GameState } from '../GameState';

type PowerIcon = 'flame' | 'shield' | 'canister';

interface Section {
    heading: string;
    lines: string[];
    icon: string;
    iconColorInt: number;
    iconColorHex: string;
    lineIcons?: Array<PowerIcon | null>;
}

const SECTIONS: Section[] = [
    {
        heading: 'GOAL',
        icon: '★',
        iconColorInt: COLORS.accentWarm,
        iconColorHex: HEX.accentWarm,
        lines: [
            'Build a rocket and fly as high as possible!',
            'Collect gears — they are your currency.',
            'Buy new parts and beat your altitude record.',
        ],
    },
    {
        heading: 'CONTROLS',
        icon: '▲',
        iconColorInt: COLORS.accentCyan,
        iconColorHex: HEX.accentCyan,
        lines: [
            'SPACE / W / UP  —  engine thrust',
            'A / LEFT  —  steer left',
            'D / RIGHT  —  steer right',
            'Mobile: tap left / center / right side of the screen.',
        ],
    },
    {
        heading: 'BUILDING YOUR ROCKET',
        icon: '⚙',
        iconColorInt: COLORS.accentPink,
        iconColorHex: HEX.accentPink,
        lines: [
            'Pick: NOSE · BODY · ENGINE · L/R modules.',
            'Budget is limited — stay within 100 pts.',
            'More powerful engines burn more fuel.',
            'Spend gears to unlock better parts.',
        ],
    },
    {
        heading: 'FLIGHT ZONES',
        icon: '◆',
        iconColorInt: COLORS.accentLilac,
        iconColorHex: HEX.accentLilac,
        lines: [
            'ATMOSPHERE  (0 – 5 000)  —  birds and obstacles.',
            'TURBULENCE  (5 000 – 15 000)  —  rougher flight.',
            'SPACE  (15 000+)  —  no air resistance, smooth sailing.',
        ],
    },
    {
        heading: 'POWER-UPS',
        icon: '!',
        iconColorInt: COLORS.accentWarm,
        iconColorHex: HEX.accentWarm,
        lines: [
            'FLAME  —  temporary speed boost.',
            'SHIELD  —  blocks birds for 3 seconds.',
            'CANISTER  —  +25% fuel.',
        ],
        lineIcons: ['flame', 'shield', 'canister'],
    },
];

export class InstructionScene extends Scene {
    constructor() {
        super('InstructionScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        const cx = 360;

        new StarfieldBackground(this, { density: 0.7 });

        const t = title(this, cx, 90, 'HOW TO PLAY', 52, {
            color: HEX.accentCyan,
            strokeThickness: 7,
        });
        t.setScale(0);
        this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });

        let cursorY = 185;

        SECTIONS.forEach((sec, si) => {
            const sectionH = 56 + sec.lines.length * 32 + 20;

            // Card background
            const g = this.add.graphics();
            g.fillStyle(COLORS.bgMid, 0.5);
            g.fillRoundedRect(30, cursorY, 660, sectionH, 14);
            g.lineStyle(3, COLORS.ink, 0.8);
            g.strokeRoundedRect(30, cursorY, 660, sectionH, 14);
            g.setAlpha(0);

            // Icon circle
            const iconCircle = this.add.graphics();
            iconCircle.fillStyle(sec.iconColorInt, 0.25);
            iconCircle.fillCircle(80, cursorY + 30, 22);
            iconCircle.lineStyle(2, sec.iconColorInt, 0.9);
            iconCircle.strokeCircle(80, cursorY + 30, 22);

            const iconText = this.add.text(80, cursorY + 30, sec.icon, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '22px',
                color: HEX.paper,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0.5);

            // Heading
            const headingText = this.add.text(116, cursorY + 30, sec.heading, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '20px',
                color: sec.iconColorHex,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0, 0.5);

            // Body lines
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const animObjects: any[] = [];
            sec.lines.forEach((line, li) => {
                const lineY = cursorY + 58 + li * 32;
                const powerIcon = sec.lineIcons?.[li] ?? null;
                const textX = powerIcon ? 158 : 116;

                if (powerIcon) {
                    const ico = this.makePowerIcon(powerIcon, 133, lineY);
                    animObjects.push(ico);
                }

                const lineText = this.add.text(textX, lineY, line, {
                    fontFamily: '"Trebuchet MS", sans-serif',
                    fontSize: '15px',
                    color: HEX.paper,
                    wordWrap: { width: powerIcon ? 520 : 560 },
                }).setOrigin(0, 0.5);
                animObjects.push(lineText);
            });

            // Animate card in
            const delay = si * 100;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ([g, iconCircle, iconText, headingText, ...animObjects] as any[]).forEach((obj: any) => {
                obj.setAlpha(0).setX(obj.x + 40);
                this.tweens.add({
                    targets: obj,
                    alpha: 1,
                    x: obj.x - 40,
                    delay,
                    duration: 350,
                    ease: 'Power2',
                });
            });

            cursorY += sectionH + 16;
        });

        // Back button — placed after all sections
        const btnY = Math.max(cursorY + 60, 1200);

        new CartoonButton(this, cx, btnY, '< BACK', {
            variant: 'ghost', width: 300, height: 64, fontSize: 24,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('MenuScene'));
            },
        });

        // Make the scene scrollable if content exceeds screen
        if (btnY > 1200) {
            this.cameras.main.setBounds(0, 0, 720, btnY + 100);
            this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
                if (pointer.isDown) {
                    this.cameras.main.scrollY -= pointer.velocity.y * 0.016;
                }
            });
        }

        warpIn(this);
    }

    private makePowerIcon(type: PowerIcon, x: number, y: number): Phaser.GameObjects.GameObject {
        if (type === 'flame') return this.makeFlameIcon(x, y);
        if (type === 'shield') return this.makeShieldIcon(x, y);
        return this.makeCanisterIcon(x, y);
    }

    private makeFlameIcon(x: number, y: number): Phaser.GameObjects.Graphics {
        const s = 0.55;
        const g = this.add.graphics();
        g.fillStyle(0xff4500, 0.95);
        g.fillEllipse(0, 0, 22 * s, 36 * s);
        g.fillStyle(0xff8c00, 0.95);
        g.fillEllipse(0, 4 * s, 14 * s, 24 * s);
        g.fillStyle(0xffdd00, 0.95);
        g.fillEllipse(0, 8 * s, 8 * s, 14 * s);
        g.setPosition(x, y);
        return g;
    }

    private makeShieldIcon(x: number, y: number): Phaser.GameObjects.Graphics {
        const s = 0.75;
        const g = this.add.graphics();
        g.lineStyle(3, 0x00ccff, 0.9);
        g.strokeCircle(0, 0, 16 * s);
        g.fillStyle(0x0088cc, 0.35);
        g.fillCircle(0, 0, 14 * s);
        g.lineStyle(2, 0x66eeff, 0.95);
        g.lineBetween(-8 * s, 0, 8 * s, 0);
        g.lineBetween(0, -8 * s, 0, 8 * s);
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(-5 * s, -5 * s, 3 * s);
        g.setPosition(x, y);
        return g;
    }

    private makeCanisterIcon(x: number, y: number): Phaser.GameObjects.Image {
        return this.add.image(x, y, 'canister').setDisplaySize(22, 22);
    }
}
