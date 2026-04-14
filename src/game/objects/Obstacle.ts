import { Scene } from 'phaser';

export type ObstacleType = 'bird' | 'cloud' | 'asteroid';

export function spawnObstacle(scene: Scene, x: number, y: number, type: ObstacleType) {
    const configs = {
        bird: { w: 30, h: 20, color: 0xcc8844, speed: 1.5, label: 'obstacle' },
        cloud: { w: 60, h: 40, color: 0xaaaacc, speed: 0.5, label: 'obstacle' },
        asteroid: { w: 35, h: 35, color: 0x888888, speed: 3.0, label: 'obstacle' },
    };

    const cfg = configs[type];

    // Visual
    const graphic = scene.add.rectangle(x, y, cfg.w, cfg.h, cfg.color);

    // Physics body
    const body = scene.matter.add.rectangle(x, y, cfg.w, cfg.h, {
        label: cfg.label,
        isSensor: false,
        frictionAir: 0,
        isStatic: false,
    });

    // Movement — birds and asteroids move horizontally
    const direction = Math.random() > 0.5 ? 1 : -1;
    scene.matter.body.setVelocity(body, {
        x: direction * cfg.speed,
        y: type === 'asteroid' ? (Math.random() - 0.3) * cfg.speed : 0,
    });

    return { graphic, body, type };
}
