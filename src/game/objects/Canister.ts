import { Scene } from 'phaser';

export function spawnCanister(scene: Scene, x: number, y: number) {
    const graphic = scene.add.image(x, y, 'canister').setDisplaySize(36, 48);

    const body = scene.matter.add.rectangle(x, y, 28, 42, {
        label: 'canister',
        isSensor: true,
        isStatic: true,
    });

    return { graphic, body };
}
