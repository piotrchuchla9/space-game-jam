import { Scene } from 'phaser';

export function spawnStormObstacle(scene: Scene, x: number, y: number) {
    const graphic = scene.add.image(x, y, 'storm').setDisplaySize(120, 90);

    const body = scene.matter.add.rectangle(x, y, 110, 70, {
        label: 'storm',
        isSensor: true,
        isStatic: true,
    });

    return { graphic, body };
}
