import { GameObjects, Scene } from 'phaser';
import { COLORS, HEX } from './colors';
import { DISPLAY_FONT } from './typography';

export type CartoonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface CartoonButtonOpts {
    variant?: CartoonVariant;
    width?: number;
    height?: number;
    fontSize?: number;
    wobble?: boolean;
    onClick?: () => void;
}

interface VariantStyle {
    fill: number;
    textColor: string;
    stroke: number;
}

const VARIANTS: Record<CartoonVariant, VariantStyle> = {
    primary: { fill: COLORS.accentCyan, textColor: HEX.ink, stroke: COLORS.ink },
    secondary: { fill: COLORS.accentWarm, textColor: HEX.ink, stroke: COLORS.ink },
    danger: { fill: COLORS.accentPink, textColor: HEX.ink, stroke: COLORS.ink },
    ghost: { fill: 0x000000, textColor: HEX.paper, stroke: COLORS.ink },
};

export class CartoonButton {
    container: GameObjects.Container;
    private shadow: GameObjects.Graphics;
    private body: GameObjects.Graphics;
    private text: GameObjects.Text;
    private hit: GameObjects.Rectangle;
    private wobbleTween?: Phaser.Tweens.Tween;
    private width: number;
    private height: number;
    private style: VariantStyle;
    private variant: CartoonVariant;
    private enabled = true;

    constructor(scene: Scene, x: number, y: number, text: string, opts: CartoonButtonOpts = {}) {
        const variant = opts.variant ?? 'primary';
        this.variant = variant;
        this.style = VARIANTS[variant];
        this.width = opts.width ?? 240;
        this.height = opts.height ?? 72;
        const fontSize = opts.fontSize ?? 28;

        this.shadow = scene.add.graphics();
        this.body = scene.add.graphics();
        this.drawBody(0, 6, variant === 'ghost' ? 0 : 1);

        this.text = scene.add.text(0, 0, text, {
            fontFamily: DISPLAY_FONT,
            fontSize: `${fontSize}px`,
            color: this.style.textColor,
            stroke: HEX.ink,
            strokeThickness: variant === 'ghost' ? 0 : 3,
        }).setOrigin(0.5);

        this.hit = scene.add.rectangle(0, 0, this.width, this.height, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        this.container = scene.add.container(x, y, [this.shadow, this.body, this.text, this.hit]);

        this.hit.on('pointerover', () => this.onHover());
        this.hit.on('pointerout', () => this.onOut());
        this.hit.on('pointerdown', () => this.onDown());
        this.hit.on('pointerup', () => this.onUp(opts.onClick));

        if (opts.wobble) {
            this.wobbleTween = scene.tweens.add({
                targets: this.container,
                angle: { from: -1.5, to: 1.5 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.inOut',
            });
        }

        scene.events.once('shutdown', () => this.destroy());
    }

    private drawBody(shadowOffset: number, bodyOffset: number, fillAlpha = 1) {
        const w = this.width;
        const h = this.height;
        this.shadow.clear();
        this.shadow.fillStyle(COLORS.ink, 0.9);
        this.shadow.fillRoundedRect(-w / 2, -h / 2 + shadowOffset, w, h, 20);

        this.body.clear();
        if (this.variant !== 'ghost') {
            this.body.fillStyle(this.style.fill, fillAlpha);
            this.body.fillRoundedRect(-w / 2, -h / 2 + bodyOffset, w, h, 20);
        }
        this.body.lineStyle(4, this.style.stroke, 1);
        this.body.strokeRoundedRect(-w / 2, -h / 2 + bodyOffset, w, h, 20);
    }

    private onHover() {
        if (!this.enabled) return;
        this.container.scene.tweens.add({ targets: this.container, scale: 1.05, duration: 100 });
        this.drawBody(10, 0);
    }

    private onOut() {
        if (!this.enabled) return;
        this.container.scene.tweens.add({ targets: this.container, scale: 1, duration: 100 });
        this.drawBody(6, 1);
    }

    private onDown() {
        if (!this.enabled) return;
        this.container.scene.tweens.add({ targets: this.container, scale: 0.95, duration: 60 });
        this.drawBody(2, 4);
    }

    private onUp(cb?: () => void) {
        if (!this.enabled) return;
        this.container.scene.tweens.add({ targets: this.container, scale: 1.05, duration: 60 });
        this.drawBody(10, 0);
        cb?.();
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.container.setAlpha(enabled ? 1 : 0.5);
        this.hit.disableInteractive();
        if (enabled) this.hit.setInteractive({ useHandCursor: true });
    }

    setText(value: string) {
        this.text.setText(value);
    }

    destroy() {
        this.wobbleTween?.remove();
        this.container.destroy();
    }
}
