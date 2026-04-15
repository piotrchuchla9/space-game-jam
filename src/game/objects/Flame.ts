import { Scene } from 'phaser';

export function spawnFlame(scene: Scene, x: number, y: number) {
    const graphics = scene.add.graphics();

    // Outer flame (dark orange)
    graphics.fillStyle(0xff4500, 0.95);
    graphics.fillEllipse(0, 0, 22, 36);

    // Middle flame (orange)
    graphics.fillStyle(0xff8c00, 0.95);
    graphics.fillEllipse(0, 4, 14, 24);

    // Inner core (yellow)
    graphics.fillStyle(0xffdd00, 0.95);
    graphics.fillEllipse(0, 8, 8, 14);

    graphics.setPosition(x, y);

    const body = scene.matter.add.rectangle(x, y, 18, 30, {
        label: 'flame',
        isSensor: true,
        isStatic: true,
    });

    return { graphic: graphics, body };
}
