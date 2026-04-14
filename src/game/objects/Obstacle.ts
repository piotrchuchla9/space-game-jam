import { Scene } from 'phaser';

export type ObstacleType = 'bird' | 'cloud' | 'asteroid';

export function spawnObstacle(scene: Scene, x: number, y: number, type: ObstacleType) {
    const configs = {
        bird: { w: 30, h: 20, color: 0xcc8844, speed: 1.5, label: 'bird' },
        cloud: { w: 60, h: 40, color: 0xaaaacc, speed: 0.5, label: 'obstacle' },
        asteroid: { w: 35, h: 35, color: 0x888888, speed: 3.0, label: 'obstacle' },
    };

    const cfg = configs[type];

    // Visual
    const graphic = type === 'bird'
        ? scene.add.image(x, y, 'bird').setDisplaySize(36, 28)
        : scene.add.rectangle(x, y, cfg.w, cfg.h, cfg.color).setVisible(false);

    // Physics body
    const body = scene.matter.add.rectangle(x, y, cfg.w, cfg.h, {
        label: cfg.label,
        isSensor: type === 'bird',
        frictionAir: 0,
        isStatic: false,
        ignoreGravity: type === 'bird',
    });

    // Movement — birds and asteroids move horizontally
    const direction = Math.random() > 0.5 ? 1 : -1;
    scene.matter.body.setVelocity(body, {
        x: direction * cfg.speed,
        y: type === 'asteroid' ? (Math.random() - 0.3) * cfg.speed : 0,
    });

    if (type === 'bird') {
        (graphic as Phaser.GameObjects.Image).setFlipX(direction > 0);
    }

    return { graphic, body, type };
}
