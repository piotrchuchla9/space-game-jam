import { Scene } from 'phaser';

export function spawnGear(scene: Scene, x: number, y: number) {
    const graphic = scene.add.rectangle(x, y, 16, 16, 0xffcc00);

    const body = scene.matter.add.rectangle(x, y, 16, 16, {
        label: 'gear',
        isSensor: true,
        isStatic: true,
    });

    return { graphic, body };
}
