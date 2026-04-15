import { Scene } from 'phaser';

export function spawnMeteorObstacle(scene: Scene, x: number, y: number, direction: -1 | 1) {
    const graphic = scene.add.image(x, y, 'meteor').setDisplaySize(50, 50);
    graphic.setRotation(direction === 1 ? -Math.PI / 6 : Math.PI / 6);

    const body = scene.matter.add.rectangle(x, y, 40, 40, {
        label: 'meteor',
        isSensor: true,
        frictionAir: 0,
        ignoreGravity: true,
    });

    const speed = 4;
    const vx = direction * Math.sin(Math.PI / 6) * speed;
    const vy = Math.cos(Math.PI / 6) * speed;
    scene.matter.body.setVelocity(body, { x: vx, y: vy });

    // Fire trail — particles emit opposite to velocity direction, forming a tail
    // Velocity heads to (vx, vy). Opposite direction (degrees) = atan2(-vy, -vx) * 180/PI.
    const oppositeAngleDeg = (Math.atan2(-vy, -vx) * 180) / Math.PI;
    const trail = scene.add.particles(x, y, 'gear', {
        speed: { min: 60, max: 140 },
        lifespan: { min: 900, max: 1400 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffff66, 0xffaa33, 0xff4422],
        frequency: 8,
        blendMode: 'ADD',
        angle: { min: oppositeAngleDeg - 4, max: oppositeAngleDeg + 4 },
    });
    trail.setDepth(100);

    return { graphic, body, trail };
}
