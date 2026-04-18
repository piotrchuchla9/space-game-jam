import { Scene } from 'phaser';
import type { MinimapItem } from '../systems/ZoneManager';

export class Minimap {
    private scene: Scene;
    private centerX: number;
    private centerY: number;
    private width: number;
    private height: number;
    private scaleX: number;
    private scaleY: number;
    private rocketOffsetYRatio: number = 0.25;

    private bg: Phaser.GameObjects.Rectangle;
    private frame: Phaser.GameObjects.Rectangle;
    private markers: Phaser.GameObjects.GameObject[] = [];
    private rocketMarker: Phaser.GameObjects.Triangle;

    constructor(scene: Scene, x: number, y: number, width: number, height: number, range: number) {
        this.scene = scene;
        this.centerX = x;
        this.centerY = y;
        this.width = width;
        this.height = height;
        this.scaleX = width / (range * 2);
        this.scaleY = height / (range * 2);

        this.bg = scene.add.rectangle(x, y, width, height, 0x000000, 0.55).setOrigin(0.5);
        this.frame = scene.add.rectangle(x, y, width, height).setOrigin(0.5).setStrokeStyle(2, 0xffcc00, 0.9);

        const rocketScreenY = y + height * this.rocketOffsetYRatio;
        // Apex u góry (rakieta leci w górę), podstawa u dołu
        this.rocketMarker = scene.add.triangle(x, rocketScreenY, 0, -6, -4, 4, 4, 4, 0xffffff).setOrigin(0.5);
    }

    update(rocketX: number, rocketY: number, items: MinimapItem[]) {
        for (const m of this.markers) m.destroy();
        this.markers.length = 0;

        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const offsetPx = this.height * this.rocketOffsetYRatio;

        for (const item of items) {
            const dx = (item.x - rocketX) * this.scaleX;
            const dy = (item.y - rocketY) * this.scaleY;
            const sx = this.centerX + dx;
            const sy = this.centerY + dy + offsetPx;

            if (sx < this.centerX - halfW || sx > this.centerX + halfW) continue;
            if (sy < this.centerY - halfH || sy > this.centerY + halfH) continue;

            this.markers.push(this.makeMarker(sx, sy, item.type));
        }
    }

    private makeMarker(sx: number, sy: number, type: MinimapItem['type']): Phaser.GameObjects.GameObject {
        switch (type) {
            case 'gear':
                return this.scene.add.image(sx, sy, 'gear').setDisplaySize(10, 10);
            case 'canister':
                return this.scene.add.image(sx, sy, 'canister').setDisplaySize(8, 10);
            case 'flame':
                return this.scene.add.circle(sx, sy, 4, 0xff8c00).setStrokeStyle(1, 0xffdd00, 1);
            case 'shield':
                return this.scene.add.circle(sx, sy, 4, 0x0088cc).setStrokeStyle(1, 0x66eeff, 1);
        }
    }

    destroy() {
        for (const m of this.markers) m.destroy();
        this.markers.length = 0;
        this.bg.destroy();
        this.frame.destroy();
        this.rocketMarker.destroy();
    }
}
