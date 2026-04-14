import { Scene, Input } from 'phaser';

export interface InputState {
    thrust: boolean;
    left: boolean;
    right: boolean;
}

export class InputManager {
    private scene: Scene;
    private keys: {
        space: Input.Keyboard.Key;
        w: Input.Keyboard.Key;
        a: Input.Keyboard.Key;
        d: Input.Keyboard.Key;
        up: Input.Keyboard.Key;
        left: Input.Keyboard.Key;
        right: Input.Keyboard.Key;
    } | null = null;

    // Touch zones
    private touchLeft = false;
    private touchCenter = false;
    private touchRight = false;

    constructor(scene: Scene) {
        this.scene = scene;

        // Keyboard
        if (this.scene.input.keyboard) {
            this.keys = {
                space: this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.SPACE),
                w: this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.W),
                a: this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.A),
                d: this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.D),
                up: this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.UP),
                left: this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.LEFT),
                right: this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.RIGHT),
            };
            console.log('Keyboard initialized:', this.keys);
        } else {
            console.warn('Keyboard plugin not available!');
        }

        // Touch / pointer
        this.scene.input.on('pointerdown', (pointer: Input.Pointer) => {
            this.updateTouch(pointer, true);
        });
        this.scene.input.on('pointermove', (pointer: Input.Pointer) => {
            if (pointer.isDown) this.updateTouch(pointer, true);
        });
        this.scene.input.on('pointerup', () => {
            this.touchLeft = false;
            this.touchCenter = false;
            this.touchRight = false;
        });
    }

    private updateTouch(pointer: Input.Pointer, isDown: boolean) {
        const screenW = this.scene.scale.width;
        const third = screenW / 3;

        this.touchLeft = isDown && pointer.x < third;
        this.touchCenter = isDown && pointer.x >= third && pointer.x <= third * 2;
        this.touchRight = isDown && pointer.x > third * 2;
    }

    getState(): InputState {
        const kbThrust = this.keys ? (this.keys.space.isDown || this.keys.w.isDown || this.keys.up.isDown) : false;
        const kbLeft = this.keys ? (this.keys.a.isDown || this.keys.left.isDown) : false;
        const kbRight = this.keys ? (this.keys.d.isDown || this.keys.right.isDown) : false;

        return {
            thrust: kbThrust || this.touchCenter,
            left: kbLeft || this.touchLeft,
            right: kbRight || this.touchRight,
        };
    }

    destroy() {
        this.scene.input.removeAllListeners();
    }
}
