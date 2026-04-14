import { GameObjects, Scene } from 'phaser';
import { HEX } from './colors';

export const DISPLAY_FONT = 'KenneyFuture, "Trebuchet MS", sans-serif';
export const BODY_FONT = '"Trebuchet MS", sans-serif';

export interface TitleOpts {
    color?: string;
    strokeColor?: string;
    strokeThickness?: number;
    rotation?: number;
}

export function title(
    scene: Scene, x: number, y: number, text: string, size = 64, opts: TitleOpts = {},
): GameObjects.Text {
    const t = scene.add.text(x, y, text, {
        fontFamily: DISPLAY_FONT,
        fontSize: `${size}px`,
        color: opts.color ?? HEX.accentCyan,
        stroke: opts.strokeColor ?? HEX.ink,
        strokeThickness: opts.strokeThickness ?? 6,
        align: 'center',
    }).setOrigin(0.5);
    if (opts.rotation) t.setRotation(opts.rotation);
    return t;
}

export interface LabelOpts {
    color?: string;
    strokeColor?: string;
    strokeThickness?: number;
    bold?: boolean;
}

export function label(
    scene: Scene, x: number, y: number, text: string, size = 20, opts: LabelOpts = {},
): GameObjects.Text {
    return scene.add.text(x, y, text, {
        fontFamily: opts.bold ? DISPLAY_FONT : BODY_FONT,
        fontSize: `${size}px`,
        color: opts.color ?? HEX.paper,
        stroke: opts.strokeColor ?? HEX.ink,
        strokeThickness: opts.strokeThickness ?? 3,
    }).setOrigin(0.5);
}

export function panel(
    scene: Scene, x: number, y: number, width: number, height: number,
): GameObjects.NineSlice {
    const p = scene.add.nineslice(x, y, 'ui_panel', 0, width, height, 16, 16, 16, 16);
    p.setOrigin(0.5);
    return p;
}
