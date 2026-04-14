import { GameObjects, Scene, Math as PhaserMath, Utils } from 'phaser';
import { COLORS } from './colors';

export type AccentKind = 'planet' | 'blueprint' | 'constellations' | 'meteor' | 'none';

interface StarfieldOpts {
    density?: number;
    shootingStars?: boolean;
}

interface Star {
    obj: GameObjects.Arc;
    baseAlpha: number;
    speed: number;
}

export class StarfieldBackground {
    private scene: Scene;
    private container: GameObjects.Container;
    private stars: Star[] = [];
    private density: number;
    private width: number;
    private height: number;
    private shootingStars: boolean;
    private twinkleTimer?: Phaser.Time.TimerEvent;
    private shootingTimer?: Phaser.Time.TimerEvent;

    constructor(scene: Scene, opts: StarfieldOpts = {}) {
        this.scene = scene;
        this.density = opts.density ?? 1;
        this.shootingStars = opts.shootingStars ?? true;
        this.width = scene.scale.width;
        this.height = scene.scale.height;

        const bg = scene.add.graphics();
        bg.fillGradientStyle(COLORS.bgDeep, COLORS.bgDeep, COLORS.bgMid, COLORS.bgNear, 1);
        bg.fillRect(0, 0, this.width, this.height);

        this.container = scene.add.container(0, 0);

        this.spawnLayer(80, 1, 0.3, 0.8);
        this.spawnLayer(40, 1.5, 0.6, 0.9);
        this.spawnLayer(20, 2, 1.0, 1.0);

        this.twinkleTimer = scene.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => this.twinkle(),
        });

        if (this.shootingStars) {
            this.scheduleShootingStar();
        }

        scene.events.once('shutdown', () => this.destroy());
        scene.events.once('destroy', () => this.destroy());
    }

    private spawnLayer(baseCount: number, radius: number, minAlpha: number, maxAlpha: number) {
        const count = Math.round(baseCount * this.density);
        for (let i = 0; i < count; i++) {
            const x = PhaserMath.Between(0, this.width);
            const y = PhaserMath.Between(0, this.height);
            const alpha = PhaserMath.FloatBetween(minAlpha, maxAlpha);
            const color = Math.random() < 0.1 ? COLORS.accentWarm : 0xffffff;
            const obj = this.scene.add.circle(x, y, radius, color, alpha);
            this.container.add(obj);
            this.stars.push({ obj, baseAlpha: alpha, speed: radius });
        }
    }

    private twinkle() {
        const sample = PhaserMath.Between(2, 6);
        for (let i = 0; i < sample; i++) {
            const star = Utils.Array.GetRandom(this.stars) as Star;
            if (!star) continue;
            this.scene.tweens.add({
                targets: star.obj,
                alpha: star.baseAlpha * 0.4,
                yoyo: true,
                duration: PhaserMath.Between(600, 1400),
            });
        }
    }

    private scheduleShootingStar() {
        const delay = PhaserMath.Between(8000, 15000);
        this.shootingTimer = this.scene.time.delayedCall(delay, () => {
            this.fireShootingStar();
            this.scheduleShootingStar();
        });
    }

    private fireShootingStar() {
        const startX = PhaserMath.Between(0, this.width);
        const startY = PhaserMath.Between(0, this.height * 0.4);
        const color = Math.random() < 0.5 ? COLORS.accentCyan : COLORS.accentPink;
        const streak = this.scene.add.rectangle(startX, startY, 60, 2, color, 0.9);
        streak.setAngle(30);
        this.container.add(streak);
        this.scene.tweens.add({
            targets: streak,
            x: startX + 300,
            y: startY + 200,
            alpha: 0,
            duration: 700,
            onComplete: () => streak.destroy(),
        });
    }

    addAccent(kind: AccentKind): GameObjects.GameObject | null {
        if (kind === 'none') return null;
        if (kind === 'planet') return this.addPlanet();
        if (kind === 'blueprint') return this.addBlueprint();
        if (kind === 'constellations') return this.addConstellations();
        if (kind === 'meteor') return this.addMeteor();
        return null;
    }

    private addPlanet(): GameObjects.Container {
        const group = this.scene.add.container(540, 1050);
        const planet = this.scene.add.graphics();
        planet.fillGradientStyle(COLORS.bgMid, COLORS.accentCyan, COLORS.bgMid, COLORS.bgNear, 1);
        planet.fillCircle(0, 0, 260);
        const rim = this.scene.add.circle(0, 0, 260, 0, 0).setStrokeStyle(4, COLORS.accentWarm, 0.5);
        group.add([planet, rim]);

        const moon = this.scene.add.circle(0, 0, 12, COLORS.accentLilac);
        const moonOrbit = this.scene.add.container(540, 1050, [moon]);
        this.scene.tweens.add({
            targets: moonOrbit,
            angle: 360,
            duration: 12000,
            repeat: -1,
        });
        moon.setPosition(320, 0);

        this.scene.tweens.add({
            targets: group,
            rotation: Math.PI * 2,
            duration: 200000,
            repeat: -1,
        });
        this.container.add([group, moonOrbit]);
        return group;
    }

    private addBlueprint(): GameObjects.Container {
        const group = this.scene.add.container(360, 460);
        const g = this.scene.add.graphics();
        g.lineStyle(1, COLORS.accentCyan, 0.18);
        for (let x = -280; x <= 280; x += 40) g.lineBetween(x, -260, x, 260);
        for (let y = -260; y <= 260; y += 40) g.lineBetween(-280, y, 280, y);
        group.add(g);

        const corners = [
            [-280, -260], [280, -260], [-280, 260], [280, 260],
        ] as const;
        corners.forEach(([x, y], i) => {
            const gear = this.scene.add.image(x, y, 'gear').setScale(0.4).setAlpha(0.5);
            this.scene.tweens.add({
                targets: gear,
                rotation: i % 2 === 0 ? Math.PI * 2 : -Math.PI * 2,
                duration: 20000,
                repeat: -1,
            });
            group.add(gear);
        });

        this.container.add(group);
        return group;
    }

    private addConstellations(): GameObjects.Container {
        const group = this.scene.add.container(0, 0);
        const constellations = [
            [[120, 300], [180, 340], [220, 400], [160, 450]],
            [[540, 500], [600, 520], [560, 580]],
            [[400, 900], [460, 920], [500, 980], [430, 1000]],
        ];
        constellations.forEach(points => {
            const g = this.scene.add.graphics();
            g.lineStyle(1, COLORS.accentCyan, 0.4);
            for (let i = 1; i < points.length; i++) {
                g.lineBetween(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
            }
            group.add(g);
            points.forEach(([px, py]) => {
                const s = this.scene.add.circle(px, py, 3, COLORS.accentWarm);
                group.add(s);
            });
        });
        this.scene.tweens.add({
            targets: group,
            alpha: { from: 0.5, to: 0.3 },
            duration: 4000,
            yoyo: true,
            repeat: -1,
        });
        this.container.add(group);
        return group;
    }

    private addMeteor(): GameObjects.Container {
        const group = this.scene.add.container(0, 0);
        const horizon = this.scene.add.graphics();
        horizon.fillGradientStyle(COLORS.accentPink, COLORS.accentPink, COLORS.accentWarm, COLORS.accentWarm, 0.7);
        horizon.fillRect(0, 1100, this.width, 180);
        group.add(horizon);
        this.scene.tweens.add({
            targets: horizon,
            alpha: { from: 0.6, to: 0.9 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
        });

        const fireMeteor = () => {
            const m = this.scene.add.rectangle(this.width + 60, -40, 80, 3, COLORS.accentPink, 1).setAngle(30);
            group.add(m);
            this.scene.tweens.add({
                targets: m,
                x: -120,
                y: 600,
                alpha: 0,
                duration: 1400,
                onComplete: () => m.destroy(),
            });
        };
        const loop = () => {
            this.scene.time.delayedCall(PhaserMath.Between(4000, 7000), () => {
                fireMeteor();
                loop();
            });
        };
        loop();

        this.container.add(group);
        return group;
    }

    destroy() {
        this.twinkleTimer?.remove(false);
        this.shootingTimer?.remove(false);
        this.container.destroy();
        this.stars = [];
    }
}
