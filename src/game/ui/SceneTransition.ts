import { GameObjects, Scene, Math as PhaserMath } from 'phaser';
import { COLORS } from './colors';

export function warpIn(scene: Scene, duration = 600) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const cover = scene.add.rectangle(w / 2, h / 2, w, h, COLORS.bgDeep, 1).setDepth(9999);
    const streaks: GameObjects.Rectangle[] = [];
    for (let i = 0; i < 40; i++) {
        const s = scene.add.rectangle(w / 2, h / 2, 2, 200, 0xffffff, 0.8).setDepth(9998);
        s.setAngle(PhaserMath.Between(0, 360));
        streaks.push(s);
    }
    scene.tweens.add({
        targets: streaks,
        scaleY: 0,
        alpha: 0,
        duration,
        onComplete: () => streaks.forEach(s => s.destroy()),
    });
    scene.tweens.add({
        targets: cover,
        alpha: 0,
        duration,
        onComplete: () => cover.destroy(),
    });
}

export function warpOut(scene: Scene, onComplete: () => void, duration = 500) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const streaks: GameObjects.Rectangle[] = [];
    for (let i = 0; i < 40; i++) {
        const s = scene.add.rectangle(w / 2, h / 2, 2, 20, 0xffffff, 0.8).setDepth(9998);
        s.setAngle(PhaserMath.Between(0, 360));
        streaks.push(s);
    }
    scene.tweens.add({
        targets: streaks,
        scaleY: 40,
        alpha: 0,
        duration,
    });
    const cover = scene.add.rectangle(w / 2, h / 2, w, h, COLORS.bgDeep, 0).setDepth(9999);
    scene.tweens.add({
        targets: cover,
        alpha: 1,
        duration,
        onComplete: () => {
            streaks.forEach(s => s.destroy());
            cover.destroy();
            onComplete();
        },
    });
}

export function flashShake(scene: Scene, onComplete?: () => void, duration = 400) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const flash = scene.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 1).setDepth(9999);
    scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration,
        onComplete: () => {
            flash.destroy();
            onComplete?.();
        },
    });
    scene.cameras.main.shake(duration, 0.015);
}

export function rocketLiftoff(
    scene: Scene, rocket: GameObjects.Image | GameObjects.Container, onComplete: () => void,
) {
    const trail = scene.add.particles(rocket.x, rocket.y, 'gear', {
        speed: { min: 50, max: 150 },
        scale: { start: 0.2, end: 0 },
        lifespan: 500,
        tint: [COLORS.accentCyan, COLORS.accentWarm],
        blendMode: 'ADD',
        follow: rocket,
        followOffset: { x: 0, y: 40 },
    });
    scene.tweens.add({
        targets: rocket,
        y: -400,
        duration: 900,
        ease: 'Cubic.easeIn',
        onComplete: () => {
            trail.destroy();
            onComplete();
        },
    });
}
