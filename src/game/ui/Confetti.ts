import { Scene, Math as PhaserMath, Utils } from 'phaser';
import { COLORS } from './colors';

export interface ConfettiOpts {
    count?: number;
    spread?: number;
    duration?: number;
}

const PALETTE = [COLORS.accentCyan, COLORS.accentWarm, COLORS.accentPink, COLORS.accentLilac];

export function burst(scene: Scene, x: number, y: number, opts: ConfettiOpts = {}) {
    const count = opts.count ?? 24;
    const spread = opts.spread ?? 220;
    const duration = opts.duration ?? 900;

    for (let i = 0; i < count; i++) {
        const color = Utils.Array.GetRandom(PALETTE) as number;
        const piece = scene.add.rectangle(x, y, 6, 10, color);
        const angle = PhaserMath.FloatBetween(-Math.PI, Math.PI);
        const speed = PhaserMath.FloatBetween(spread * 0.3, spread);
        const tx = x + Math.cos(angle) * speed;
        const ty = y + Math.sin(angle) * speed + PhaserMath.Between(80, 200);
        scene.tweens.add({
            targets: piece,
            x: tx,
            y: ty,
            alpha: 0,
            angle: PhaserMath.Between(-360, 360),
            duration,
            ease: 'Quad.easeOut',
            onComplete: () => piece.destroy(),
        });
    }
}
