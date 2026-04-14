import { Scene } from 'phaser';

export interface GearObject {
    graphic: Phaser.GameObjects.Image;
    bodyId: number;
    body: any;
    collected: boolean;
}

export function spawnGear(scene: Scene, x: number, y: number): GearObject {
    const graphic = scene.add.image(x, y, 'gear').setDisplaySize(28, 28);

    const body = scene.matter.add.rectangle(x, y, 20, 20, {
        label: 'gear',
        isSensor: true,
        isStatic: true,
    });

    return { graphic, body, bodyId: (body as any).id, collected: false };
}
