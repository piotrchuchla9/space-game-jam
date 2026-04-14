import { Scene } from 'phaser';

export interface GearObject {
    graphic: Phaser.GameObjects.Arc;
    bodyId: number;
    body: any;
    collected: boolean;
}

export function spawnGear(scene: Scene, x: number, y: number): GearObject {
    const graphic = scene.add.circle(x, y, 10, 0xffcc00).setStrokeStyle(2, 0xff9900);

    const body = scene.matter.add.rectangle(x, y, 20, 20, {
        label: 'gear',
        isSensor: true,
        isStatic: true,
    });

    return { graphic, body, bodyId: (body as any).id, collected: false };
}
