import { Scene } from 'phaser';
import { Rocket } from '../objects/Rocket';
import { InputManager } from '../systems/InputManager';
import { ZoneManager } from '../systems/ZoneManager';
import { GameState } from '../GameState';

export class FlightScene extends Scene {
    private rocket!: Rocket;
    private inputManager!: InputManager;
    private zoneManager!: ZoneManager;
    private altitude: number = 0;
    private gearsCollected: number = 0;
    private maxAltitude: number = 0;
    private isThrusting: boolean = false;
    private engineEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private crashed: boolean = false;

    constructor() {
        super('FlightScene');
    }

    create() {
        this.crashed = false;

        // World bounds — wide and tall
        this.matter.world.setBounds(-500, -50000, 1720, 51280);

        // Create rocket at bottom center
        this.rocket = new Rocket(this, 360, 1100);
        this.inputManager = new InputManager(this);
        this.zoneManager = new ZoneManager(this);

        // Listen for turbulence
        this.events.on('turbulence', (force: { x: number; y: number }) => {
            this.matter.body.applyForce(this.rocket.body, this.rocket.body.position, force);
        });

        // Camera follows rocket
        const rocketGraphic = this.add.rectangle(
            this.rocket.body.position.x,
            this.rocket.body.position.y,
            30, 80, 0x4a9eff
        );
        this.cameras.main.startFollow(rocketGraphic, false, 0.1, 0.1);
        this.cameras.main.setFollowOffset(0, 200);

        // Store reference for camera tracking
        this.data.set('rocketGraphic', rocketGraphic);

        // Engine particles — skip for now, Phaser 4 API differs
        this.engineEmitter = null;

        // Launch HUD as parallel scene
        this.scene.launch('HUDScene');

        // Ground
        this.matter.add.rectangle(360, 1250, 720, 100, { isStatic: true, label: 'ground' });

        // Collision handling
        this.matter.world.on('collisionstart', (event: any) => {
            for (const pair of event.pairs) {
                const labels = [pair.bodyA.label, pair.bodyB.label];

                if (labels.includes('rocket') && labels.includes('obstacle')) {
                    const destroyed = this.rocket.takeDamage();
                    if (destroyed) this.crash();
                }

                if (labels.includes('rocket') && labels.includes('gear')) {
                    const gearBody = pair.bodyA.label === 'gear' ? pair.bodyA : pair.bodyB;
                    this.collectGear(gearBody);
                }

                if (labels.includes('rocket') && labels.includes('ground')) {
                    if (this.maxAltitude > 50) {
                        this.crash();
                    }
                }
            }
        });

        this.gearsCollected = 0;
        this.maxAltitude = 0;
    }

    update(_time: number, delta: number) {
        if (!this.rocket || !this.rocket.body || this.crashed) return;

        const inputState = this.inputManager.getState();

        // Debug input every 60 frames
        if (Math.random() < 0.02) {
            console.log('Input state:', inputState, 'Fuel:', this.rocket.fuel, 'Pos:', this.rocket.body.position.y);
        }

        // Thrust
        this.isThrusting = inputState.thrust && this.rocket.fuel > 0;
        if (this.isThrusting) {
            this.rocket.applyThrust(delta);
        }

        // Side thrust
        if (inputState.left) this.rocket.applySideThrust(-1);
        if (inputState.right) this.rocket.applySideThrust(1);

        // Drag based on zone
        const alt = this.rocket.getAltitude();
        let dragZone = 1.0;
        if (alt > 3000) dragZone = 0.1; // space
        this.rocket.applyDrag(dragZone);

        // Update altitude
        this.altitude = alt;
        if (this.altitude > this.maxAltitude) {
            this.maxAltitude = this.altitude;
        }

        // Zone manager
        this.zoneManager.update(delta, this.altitude, this.rocket.body.position.x);

        // Update rocket graphic position (for camera)
        const rocketGraphic = this.data.get('rocketGraphic') as Phaser.GameObjects.Rectangle;
        if (rocketGraphic) {
            rocketGraphic.setPosition(this.rocket.body.position.x, this.rocket.body.position.y);
            rocketGraphic.setRotation(this.rocket.body.angle);
        }

        // Update engine particles
        if (this.engineEmitter) {
            this.engineEmitter.setPosition(this.rocket.body.position.x, this.rocket.body.position.y + 40);
            this.engineEmitter.emitting = this.isThrusting;
        }

        // Background color transition
        let bgColor: number;
        if (this.altitude < 1000) {
            bgColor = this.lerpColor(0x87CEEB, 0x2a1a4e, this.altitude / 1000);
        } else if (this.altitude < 3000) {
            bgColor = this.lerpColor(0x2a1a4e, 0x0a0a1a, (this.altitude - 1000) / 2000);
        } else {
            bgColor = 0x0a0a1a;
        }
        this.cameras.main.setBackgroundColor(bgColor);

        // Emit data for HUD
        this.events.emit('updateHUD', {
            altitude: Math.floor(this.altitude),
            fuel: this.rocket.fuel,
            maxFuel: this.rocket.maxFuel,
            gears: this.gearsCollected,
            zone: this.getZoneName(),
        });

        // Check if rocket fell below start and has been flying
        if (this.rocket.body.position.y > 1300 && this.maxAltitude > 50) {
            this.crash();
        }
    }

    private lerpColor(from: number, to: number, t: number): number {
        t = Math.max(0, Math.min(1, t));
        const r1 = (from >> 16) & 0xff, g1 = (from >> 8) & 0xff, b1 = from & 0xff;
        const r2 = (to >> 16) & 0xff, g2 = (to >> 8) & 0xff, b2 = to & 0xff;
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return (r << 16) | (g << 8) | b;
    }

    private getZoneName(): string {
        if (this.altitude < 1000) return 'ATMOSPHERE';
        if (this.altitude < 3000) return 'TURBULENCE';
        return 'SPACE';
    }

    private collectGear(gearBody: MatterJS.BodyType) {
        this.gearsCollected++;
        this.zoneManager.removeGearByBody(gearBody);
    }

    private crash() {
        if (this.crashed) return;
        this.crashed = true;

        this.cameras.main.shake(300, 0.02);
        this.time.delayedCall(400, () => {
            GameState.finishRun(this.maxAltitude, this.gearsCollected);
            this.zoneManager.destroy();
            this.inputManager.destroy();
            this.rocket.destroy();
            this.scene.stop('HUDScene');
            this.scene.start('CrashScene');
        });
    }
}
