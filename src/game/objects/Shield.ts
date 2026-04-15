import { Scene } from 'phaser';

export function spawnShield(scene: Scene, x: number, y: number) {
    const graphics = scene.add.graphics();

    // Outer ring
    graphics.lineStyle(3, 0x00ccff, 0.9);
    graphics.strokeCircle(0, 0, 16);

    // Inner fill
    graphics.fillStyle(0x0088cc, 0.35);
    graphics.fillCircle(0, 0, 14);

    // Cross detail
    graphics.lineStyle(2, 0x66eeff, 0.95);
    graphics.lineBetween(-8, 0, 8, 0);
    graphics.lineBetween(0, -8, 0, 8);

    // Glint
    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(-5, -5, 3);

    graphics.setPosition(x, y);

    const body = scene.matter.add.circle(x, y, 14, {
        label: 'shield',
        isSensor: true,
        isStatic: true,
    });

    return { graphic: graphics, body };
}
