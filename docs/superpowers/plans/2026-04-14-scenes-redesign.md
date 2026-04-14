# Scenes Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain monospace visuals in MenuScene, BuildScene, AchievementsScene, and CrashScene with a cohesive cartoon-cosmic look, backed by a small reusable UI design system.

**Architecture:** Introduce a `src/game/ui/` design system (starfield background, cartoon button, scene transitions, confetti, typography helpers) plus a new `Preloader` boot scene that loads fonts and shared assets once. Each of the four scenes is rebuilt on top of these primitives without touching gameplay logic or state.

**Tech Stack:** Phaser 4, TypeScript, Vite. No test runner present — verification is "run `npm run dev`, open `localhost:8080`, visually inspect". Existing assets in `public/assets/` (`KenneyFuture.ttf`, `ui_panel.png`, `ui_slide_track.png`, `ui_slide_fill.png`, `rocket.png`, `gear.png`).

**Spec reference:** `docs/superpowers/specs/2026-04-14-scenes-redesign-design.md`

---

## File Structure

**Create:**
- `src/game/ui/colors.ts` — palette tokens
- `src/game/ui/typography.ts` — title/label/panel helpers
- `src/game/ui/StarfieldBackground.ts` — parallax stars + scene accents
- `src/game/ui/CartoonButton.ts` — sticker-style button
- `src/game/ui/SceneTransition.ts` — warp / flash / liftoff effects
- `src/game/ui/Confetti.ts` — particle burst wrapper
- `src/game/scenes/Preloader.ts` — boot scene loading fonts + shared assets

**Modify:**
- `public/style.css` — add `@font-face` for KenneyFuture
- `src/game/main.ts` — register Preloader as first scene
- `src/game/scenes/MenuScene.ts` — full rebuild on design system
- `src/game/scenes/BuildScene.ts` — full rebuild on design system
- `src/game/scenes/AchievementsScene.ts` — full rebuild on design system
- `src/game/scenes/CrashScene.ts` — full rebuild on design system

**Unchanged:** `FlightScene.ts`, `HUDScene.ts`, `GameState.ts`, `parts.ts`, `systems/*`.

---

## Task 1: Palette tokens module

**Files:**
- Create: `src/game/ui/colors.ts`

- [ ] **Step 1: Create the palette module**

```typescript
// src/game/ui/colors.ts
// Shared cartoon-cosmic palette. Keep in sync with spec 2026-04-14-scenes-redesign-design.md.

export const COLORS = {
    bgDeep: 0x0a0e27,
    bgMid: 0x1f1547,
    bgNear: 0x2a4b6e,
    accentWarm: 0xffcc00,
    accentPink: 0xff5fa2,
    accentCyan: 0x4ad8ff,
    accentLilac: 0xb79dff,
    ink: 0x0a0a1e,
    paper: 0xffffff,
} as const;

export const HEX = {
    bgDeep: '#0a0e27',
    bgMid: '#1f1547',
    bgNear: '#2a4b6e',
    accentWarm: '#ffcc00',
    accentPink: '#ff5fa2',
    accentCyan: '#4ad8ff',
    accentLilac: '#b79dff',
    ink: '#0a0a1e',
    paper: '#ffffff',
} as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run dev`
Expected: dev server starts at `http://localhost:8080` without TS errors. Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/colors.ts
git commit -m "feat(ui): add cartoon-cosmic palette tokens"
```

---

## Task 2: Font loading via CSS + Preloader boot scene

**Files:**
- Modify: `public/style.css`
- Create: `src/game/scenes/Preloader.ts`
- Modify: `src/game/main.ts`

- [ ] **Step 1: Register KenneyFuture font in stylesheet**

Open `public/style.css` and replace its contents with:

```css
@font-face {
    font-family: 'KenneyFuture';
    src: url('assets/KenneyFuture.ttf') format('truetype');
    font-display: block;
}

body {
    margin: 0;
    padding: 0;
    color: rgba(255, 255, 255, 0.87);
    background-color: #0f0f0f;
}

#app {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}
```

- [ ] **Step 2: Create Preloader scene**

```typescript
// src/game/scenes/Preloader.ts
import { Scene } from 'phaser';
import { COLORS } from '../ui/colors';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        this.load.image('rocket', 'assets/rocket.png');
        this.load.image('gear', 'assets/gear.png');
        this.load.image('ground', 'assets/ground.png');
        this.load.image('canister', 'assets/canister.png');
        this.load.image('bird', 'assets/bird.png');
        this.load.image('station', 'assets/station_005.png');
        this.load.image('ui_panel', 'assets/ui_panel.png');
        this.load.image('ui_slide_track', 'assets/ui_slide_track.png');
        this.load.image('ui_slide_fill', 'assets/ui_slide_fill.png');

        this.load.audio('soundtrack', 'assets/soundtrack.mp3');
        this.load.audio('click', 'assets/click.mp3');
        this.load.audio('buy', 'assets/buy.mp3');
        this.load.audio('error', 'assets/error.mp3');
        this.load.audio('build', 'assets/build.mp3');
        this.load.audio('fuel', 'assets/fuel.mp3');
        this.load.audio('fuelAlert', 'assets/fuelAlert.mp3');
        this.load.audio('gear_sfx', 'assets/gear.mp3');
        this.load.audio('explosion', 'assets/explosionCrunch.ogg');
        this.load.audio('thruster', 'assets/thrusterFire.ogg');
    }

    create() {
        // Simple loading splash while font resolves.
        this.cameras.main.setBackgroundColor(COLORS.bgDeep);
        this.add.text(360, 640, 'LOADING', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'monospace',
        }).setOrigin(0.5);

        const go = () => this.scene.start('MenuScene');
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
        if (fonts && fonts.load) {
            fonts.load('16px KenneyFuture').then(go).catch(go);
        } else {
            go();
        }
    }
}
```

- [ ] **Step 3: Wire Preloader as the first scene**

In `src/game/main.ts`, replace the existing `import`/`scene` lines so the file reads:

```typescript
import { AUTO, Game, Scale, Types } from "phaser";
import { Preloader } from "./scenes/Preloader";
import { MenuScene } from "./scenes/MenuScene";
import { BuildScene } from "./scenes/BuildScene";
import { FlightScene } from "./scenes/FlightScene";
import { HUDScene } from "./scenes/HUDScene";
import { CrashScene } from "./scenes/CrashScene";
import { AchievementsScene } from "./scenes/AchievementsScene";
import { GameState } from "./GameState";

const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 720,
  height: 1280,
  parent: "game-container",
  backgroundColor: "#0a0e27",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  input: {
    keyboard: true,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 0.3 },
      debug: false,
    },
  },
  scene: [Preloader, MenuScene, BuildScene, FlightScene, HUDScene, CrashScene, AchievementsScene],
};

const StartGame = (parent: string) => {
  if (typeof WavedashJS !== "undefined") {
    WavedashJS.init({ debug: true, deferEvents: true });
    WavedashJS.addEventListener(WavedashJS.Events.BACKEND_CONNECTED, () => {
      console.log("Wavedash backend connected");
      GameState.wavedashReady = true;
    });
    WavedashJS.readyForEvents();
  }
  return new Game({ ...config, parent });
};

export default StartGame;
```

- [ ] **Step 4: Remove duplicate `preload()` loads from existing scenes**

In each of `MenuScene.ts`, `BuildScene.ts`, `CrashScene.ts`, `AchievementsScene.ts`, `FlightScene.ts`, `HUDScene.ts`, delete the `preload()` methods that only load assets now owned by Preloader. If a scene's `preload()` becomes empty, delete the whole method. Leave audio playback / sound.add calls in `create()` untouched — those only need the asset key to already exist in the cache.

For FlightScene/HUDScene, only delete loads for keys Preloader now covers; keep any unique loads.

- [ ] **Step 5: Verify the game still boots to menu**

Run: `npm run dev`
Open `http://localhost:8080`. Expected: brief "LOADING" text, then MenuScene renders with existing (pre-redesign) visuals. No console errors. Confirm KenneyFuture is available in DevTools → Network (the .ttf request returns 200).

- [ ] **Step 6: Commit**

```bash
git add public/style.css src/game/scenes/Preloader.ts src/game/main.ts src/game/scenes/MenuScene.ts src/game/scenes/BuildScene.ts src/game/scenes/CrashScene.ts src/game/scenes/AchievementsScene.ts src/game/scenes/FlightScene.ts src/game/scenes/HUDScene.ts
git commit -m "feat(ui): add Preloader boot scene with font and asset preload"
```

---

## Task 3: Typography helpers

**Files:**
- Create: `src/game/ui/typography.ts`

- [ ] **Step 1: Create helpers**

```typescript
// src/game/ui/typography.ts
import { GameObjects, Scene } from 'phaser';
import { HEX } from './colors';

export const DISPLAY_FONT = 'KenneyFuture, "Trebuchet MS", sans-serif';
export const BODY_FONT = '"Trebuchet MS", sans-serif';

export interface TitleOpts {
    color?: string;
    strokeColor?: string;
    strokeThickness?: number;
    rotation?: number;
}

export function title(
    scene: Scene, x: number, y: number, text: string, size = 64, opts: TitleOpts = {},
): GameObjects.Text {
    const t = scene.add.text(x, y, text, {
        fontFamily: DISPLAY_FONT,
        fontSize: `${size}px`,
        color: opts.color ?? HEX.accentCyan,
        stroke: opts.strokeColor ?? HEX.ink,
        strokeThickness: opts.strokeThickness ?? 6,
        align: 'center',
    }).setOrigin(0.5);
    if (opts.rotation) t.setRotation(opts.rotation);
    return t;
}

export interface LabelOpts {
    color?: string;
    strokeColor?: string;
    strokeThickness?: number;
    bold?: boolean;
}

export function label(
    scene: Scene, x: number, y: number, text: string, size = 20, opts: LabelOpts = {},
): GameObjects.Text {
    return scene.add.text(x, y, text, {
        fontFamily: opts.bold ? DISPLAY_FONT : BODY_FONT,
        fontSize: `${size}px`,
        color: opts.color ?? HEX.paper,
        stroke: opts.strokeColor ?? HEX.ink,
        strokeThickness: opts.strokeThickness ?? 3,
    }).setOrigin(0.5);
}

/**
 * Returns an ui_panel.png nine-slice configured for a paper-colored panel.
 * Requires the `ui_panel` image to be preloaded.
 */
export function panel(
    scene: Scene, x: number, y: number, width: number, height: number,
): GameObjects.NineSlice {
    const p = scene.add.nineslice(x, y, 'ui_panel', 0, width, height, 16, 16, 16, 16);
    p.setOrigin(0.5);
    return p;
}
```

- [ ] **Step 2: Quick smoke test in MenuScene**

Temporarily add to `MenuScene.create()` (first line) to sanity-check the font renders on canvas:

```typescript
import { title } from '../ui/typography';
// ...
title(this, 360, 100, 'FONT TEST', 48);
```

Run `npm run dev`. Expected: "FONT TEST" renders in KenneyFuture with thick dark outline at top of menu. Remove the temp line afterwards.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/typography.ts
git commit -m "feat(ui): add typography helpers (title/label/panel)"
```

---

## Task 4: StarfieldBackground (stars + accents)

**Files:**
- Create: `src/game/ui/StarfieldBackground.ts`

- [ ] **Step 1: Implement the starfield**

```typescript
// src/game/ui/StarfieldBackground.ts
import { GameObjects, Scene } from 'phaser';
import { COLORS } from './colors';

export type AccentKind = 'planet' | 'blueprint' | 'constellations' | 'meteor' | 'none';

interface StarfieldOpts {
    density?: number; // multiplier for star counts
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

        this.spawnLayer(80, 1, 0.3, 0.8);   // far
        this.spawnLayer(40, 1.5, 0.6, 0.9); // mid
        this.spawnLayer(20, 2, 1.0, 1.0);   // near

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
            const x = Phaser.Math.Between(0, this.width);
            const y = Phaser.Math.Between(0, this.height);
            const alpha = Phaser.Math.FloatBetween(minAlpha, maxAlpha);
            const color = Math.random() < 0.1 ? COLORS.accentWarm : 0xffffff;
            const obj = this.scene.add.circle(x, y, radius, color, alpha);
            this.container.add(obj);
            this.stars.push({ obj, baseAlpha: alpha, speed: radius });
        }
    }

    private twinkle() {
        const sample = Phaser.Math.Between(2, 6);
        for (let i = 0; i < sample; i++) {
            const star = Phaser.Utils.Array.GetRandom(this.stars) as Star;
            if (!star) continue;
            this.scene.tweens.add({
                targets: star.obj,
                alpha: star.baseAlpha * 0.4,
                yoyo: true,
                duration: Phaser.Math.Between(600, 1400),
            });
        }
    }

    private scheduleShootingStar() {
        const delay = Phaser.Math.Between(8000, 15000);
        this.shootingTimer = this.scene.time.delayedCall(delay, () => {
            this.fireShootingStar();
            this.scheduleShootingStar();
        });
    }

    private fireShootingStar() {
        const startX = Phaser.Math.Between(0, this.width);
        const startY = Phaser.Math.Between(0, this.height * 0.4);
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
        // Three decorative constellations; full-list version is driven by the scene later.
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
            this.scene.time.delayedCall(Phaser.Math.Between(4000, 7000), () => {
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
```

- [ ] **Step 2: Smoke test on MenuScene (temp wiring)**

In `MenuScene.create()` add (temporarily, top of method):

```typescript
import { StarfieldBackground } from '../ui/StarfieldBackground';
// ...
const sf = new StarfieldBackground(this);
sf.addAccent('planet');
```

Run `npm run dev`. Expected: deep-space gradient, sparkly stars, rotating planet bottom-right with orbiting moon, occasional shooting star. Move test to each kind briefly (`blueprint`, `constellations`, `meteor`) to confirm each renders. Revert temp code afterwards.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/StarfieldBackground.ts
git commit -m "feat(ui): add StarfieldBackground with parallax stars and scene accents"
```

---

## Task 5: CartoonButton

**Files:**
- Create: `src/game/ui/CartoonButton.ts`

- [ ] **Step 1: Implement CartoonButton**

```typescript
// src/game/ui/CartoonButton.ts
import { GameObjects, Scene } from 'phaser';
import { COLORS, HEX } from './colors';
import { DISPLAY_FONT } from './typography';

export type CartoonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface CartoonButtonOpts {
    variant?: CartoonVariant;
    width?: number;
    height?: number;
    fontSize?: number;
    wobble?: boolean;
    onClick?: () => void;
}

interface VariantStyle {
    fill: number;
    textColor: string;
    stroke: number;
}

const VARIANTS: Record<CartoonVariant, VariantStyle> = {
    primary: { fill: COLORS.accentCyan, textColor: HEX.ink, stroke: COLORS.ink },
    secondary: { fill: COLORS.accentWarm, textColor: HEX.ink, stroke: COLORS.ink },
    danger: { fill: COLORS.accentPink, textColor: HEX.ink, stroke: COLORS.ink },
    ghost: { fill: 0x000000, textColor: HEX.paper, stroke: COLORS.ink },
};

export class CartoonButton {
    container: GameObjects.Container;
    private shadow: GameObjects.Graphics;
    private body: GameObjects.Graphics;
    private text: GameObjects.Text;
    private hit: GameObjects.Rectangle;
    private wobbleTween?: Phaser.Tweens.Tween;
    private width: number;
    private height: number;
    private style: VariantStyle;
    private variant: CartoonVariant;
    private enabled = true;

    constructor(scene: Scene, x: number, y: number, text: string, opts: CartoonButtonOpts = {}) {
        const variant = opts.variant ?? 'primary';
        this.variant = variant;
        this.style = VARIANTS[variant];
        this.width = opts.width ?? 240;
        this.height = opts.height ?? 72;
        const fontSize = opts.fontSize ?? 28;

        this.shadow = scene.add.graphics();
        this.body = scene.add.graphics();
        this.drawBody(0, 6, variant === 'ghost' ? 0 : 1);

        this.text = scene.add.text(0, 0, text, {
            fontFamily: DISPLAY_FONT,
            fontSize: `${fontSize}px`,
            color: this.style.textColor,
            stroke: HEX.ink,
            strokeThickness: variant === 'ghost' ? 0 : 3,
        }).setOrigin(0.5);

        this.hit = scene.add.rectangle(0, 0, this.width, this.height, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        this.container = scene.add.container(x, y, [this.shadow, this.body, this.text, this.hit]);

        this.hit.on('pointerover', () => this.onHover());
        this.hit.on('pointerout', () => this.onOut());
        this.hit.on('pointerdown', () => this.onDown());
        this.hit.on('pointerup', () => this.onUp(opts.onClick));

        if (opts.wobble) {
            this.wobbleTween = scene.tweens.add({
                targets: this.container,
                angle: { from: -1.5, to: 1.5 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.inOut',
            });
        }

        scene.events.once('shutdown', () => this.destroy());
    }

    private drawBody(shadowOffset: number, bodyOffset: number, fillAlpha = 1) {
        const w = this.width;
        const h = this.height;
        this.shadow.clear();
        this.shadow.fillStyle(COLORS.ink, 0.9);
        this.shadow.fillRoundedRect(-w / 2, -h / 2 + shadowOffset, w, h, 20);

        this.body.clear();
        if (this.variant !== 'ghost') {
            this.body.fillStyle(this.style.fill, fillAlpha);
            this.body.fillRoundedRect(-w / 2, -h / 2 + bodyOffset, w, h, 20);
        }
        this.body.lineStyle(4, this.style.stroke, 1);
        this.body.strokeRoundedRect(-w / 2, -h / 2 + bodyOffset, w, h, 20);
    }

    private onHover() {
        if (!this.enabled) return;
        this.container.scene.tweens.add({ targets: this.container, scale: 1.05, duration: 100 });
        this.drawBody(10, 0);
    }

    private onOut() {
        if (!this.enabled) return;
        this.container.scene.tweens.add({ targets: this.container, scale: 1, duration: 100 });
        this.drawBody(6, 1);
    }

    private onDown() {
        if (!this.enabled) return;
        this.container.scene.tweens.add({ targets: this.container, scale: 0.95, duration: 60 });
        this.drawBody(2, 4);
    }

    private onUp(cb?: () => void) {
        if (!this.enabled) return;
        this.container.scene.tweens.add({ targets: this.container, scale: 1.05, duration: 60 });
        this.drawBody(10, 0);
        cb?.();
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        this.container.setAlpha(enabled ? 1 : 0.5);
        this.hit.disableInteractive();
        if (enabled) this.hit.setInteractive({ useHandCursor: true });
    }

    setText(value: string) {
        this.text.setText(value);
    }

    destroy() {
        this.wobbleTween?.remove();
        this.container.destroy();
    }
}
```

- [ ] **Step 2: Smoke test**

Temporarily in `MenuScene.create()`:

```typescript
import { CartoonButton } from '../ui/CartoonButton';
// ...
new CartoonButton(this, 360, 300, 'PLAY', { variant: 'primary', width: 260, height: 80, fontSize: 32, wobble: true, onClick: () => console.log('click') });
new CartoonButton(this, 360, 400, 'LOCKED', { variant: 'ghost', width: 220, height: 60, fontSize: 24 });
```

Run `npm run dev`. Expected: primary button wobbles, hover scales + shadow grows, click logs. Ghost button renders with outline only. Revert temp code.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/CartoonButton.ts
git commit -m "feat(ui): add CartoonButton with sticker look and interaction states"
```

---

## Task 6: Confetti

**Files:**
- Create: `src/game/ui/Confetti.ts`

- [ ] **Step 1: Implement burst helper**

```typescript
// src/game/ui/Confetti.ts
import { Scene } from 'phaser';
import { COLORS } from './colors';

export interface ConfettiOpts {
    count?: number;
    spread?: number;
    duration?: number;
}

const PALETTE = [COLORS.accentCyan, COLORS.accentWarm, COLORS.accentPink, COLORS.accentLilac];

export function burst(scene: Scene, x: number, y: number, opts: ConfettiOpts = {}) {
    const count = opts.count ?? 24;
    const spread = opts.spread ?? 220;
    const duration = opts.duration ?? 900;

    for (let i = 0; i < count; i++) {
        const color = Phaser.Utils.Array.GetRandom(PALETTE) as number;
        const piece = scene.add.rectangle(x, y, 6, 10, color);
        const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
        const speed = Phaser.Math.FloatBetween(spread * 0.3, spread);
        const tx = x + Math.cos(angle) * speed;
        const ty = y + Math.sin(angle) * speed + Phaser.Math.Between(80, 200);
        scene.tweens.add({
            targets: piece,
            x: tx,
            y: ty,
            alpha: 0,
            angle: Phaser.Math.Between(-360, 360),
            duration,
            ease: 'Quad.easeOut',
            onComplete: () => piece.destroy(),
        });
    }
}
```

- [ ] **Step 2: Smoke test**

Temporarily in `MenuScene.create()`:

```typescript
import { burst } from '../ui/Confetti';
// ...
this.input.on('pointerdown', (p: Phaser.Input.Pointer) => burst(this, p.x, p.y));
```

Run `npm run dev`, click anywhere → confetti burst. Revert.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/Confetti.ts
git commit -m "feat(ui): add confetti burst helper"
```

---

## Task 7: SceneTransition

**Files:**
- Create: `src/game/ui/SceneTransition.ts`

- [ ] **Step 1: Implement transitions**

```typescript
// src/game/ui/SceneTransition.ts
import { GameObjects, Scene } from 'phaser';
import { COLORS } from './colors';

export function warpIn(scene: Scene, duration = 600) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const cover = scene.add.rectangle(w / 2, h / 2, w, h, COLORS.bgDeep, 1).setDepth(9999);
    const streaks: GameObjects.Rectangle[] = [];
    for (let i = 0; i < 40; i++) {
        const s = scene.add.rectangle(w / 2, h / 2, 2, 200, 0xffffff, 0.8).setDepth(9998);
        s.setAngle(Phaser.Math.Between(0, 360));
        streaks.push(s);
    }
    scene.tweens.add({
        targets: streaks,
        scaleY: 0,
        alpha: 0,
        duration,
        onComplete: () => streaks.forEach(s => s.destroy()),
    });
    scene.tweens.add({
        targets: cover,
        alpha: 0,
        duration,
        onComplete: () => cover.destroy(),
    });
}

export function warpOut(scene: Scene, onComplete: () => void, duration = 500) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const streaks: GameObjects.Rectangle[] = [];
    for (let i = 0; i < 40; i++) {
        const s = scene.add.rectangle(w / 2, h / 2, 2, 20, 0xffffff, 0.8).setDepth(9998);
        s.setAngle(Phaser.Math.Between(0, 360));
        streaks.push(s);
    }
    scene.tweens.add({
        targets: streaks,
        scaleY: 40,
        alpha: 0,
        duration,
    });
    const cover = scene.add.rectangle(w / 2, h / 2, w, h, COLORS.bgDeep, 0).setDepth(9999);
    scene.tweens.add({
        targets: cover,
        alpha: 1,
        duration,
        onComplete: () => {
            streaks.forEach(s => s.destroy());
            cover.destroy();
            onComplete();
        },
    });
}

export function flashShake(scene: Scene, onComplete?: () => void, duration = 400) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const flash = scene.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 1).setDepth(9999);
    scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration,
        onComplete: () => {
            flash.destroy();
            onComplete?.();
        },
    });
    scene.cameras.main.shake(duration, 0.015);
}

export function rocketLiftoff(
    scene: Scene, rocket: GameObjects.Image | GameObjects.Container, onComplete: () => void,
) {
    const trail = scene.add.particles(rocket.x, rocket.y, 'gear', {
        speed: { min: 50, max: 150 },
        scale: { start: 0.2, end: 0 },
        lifespan: 500,
        tint: [COLORS.accentCyan, COLORS.accentWarm],
        blendMode: 'ADD',
        follow: rocket,
        followOffset: { x: 0, y: 40 },
    });
    scene.tweens.add({
        targets: rocket,
        y: -400,
        duration: 900,
        ease: 'Cubic.easeIn',
        onComplete: () => {
            trail.destroy();
            onComplete();
        },
    });
}
```

- [ ] **Step 2: Smoke test**

In `MenuScene.create()` temporarily: `warpIn(this);` — should see star streaks dissolving on entry. Then in PLAY handler temporarily: `warpOut(this, () => this.scene.start('BuildScene'));`. Verify click PLAY fades with streaks then BuildScene appears. Revert temp code.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/SceneTransition.ts
git commit -m "feat(ui): add scene transitions (warp, flash, liftoff)"
```

---

## Task 8: Rebuild MenuScene

**Files:**
- Modify: `src/game/scenes/MenuScene.ts` (full replacement)

- [ ] **Step 1: Replace MenuScene contents**

```typescript
// src/game/scenes/MenuScene.ts
import { Math as PhaserMath, Scene, GameObjects } from 'phaser';
import { GameState } from '../GameState';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut } from '../ui/SceneTransition';
import { title, label, panel } from '../ui/typography';
import { COLORS, HEX } from '../ui/colors';

export class MenuScene extends Scene {
    private soundtrack!: Phaser.Sound.BaseSound;

    constructor() {
        super('MenuScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        this.soundtrack = this.sound.add('soundtrack', { loop: true, volume: GameState.getMusicVolume() });
        this.soundtrack.play();
        this.events.on('shutdown', () => this.soundtrack.stop());

        const starfield = new StarfieldBackground(this);
        starfield.addAccent('planet');

        const cx = 360;

        // Hero rocket
        const rocket = this.add.image(cx, 280, 'rocket').setScale(1.2);
        this.tweens.add({
            targets: rocket,
            y: 272,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut',
        });
        this.add.particles(cx, 360, 'gear', {
            speed: { min: 30, max: 80 },
            lifespan: 600,
            scale: { start: 0.1, end: 0 },
            tint: COLORS.accentCyan,
            frequency: 100,
            blendMode: 'ADD',
        }).setDepth(rocket.depth - 1);

        // Title
        const t = title(this, cx, 540, 'ROCKET\nBUILDER', 72, {
            color: HEX.accentCyan, strokeThickness: 8, rotation: -0.03,
        });
        t.setScale(0).setAlign('center');
        this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });

        // Highscore chip
        panel(this, cx, 670, 300, 56);
        const hs = label(this, cx, 670, `★ HIGHSCORE: ${GameState.highscore}`, 22, {
            color: HEX.accentWarm, bold: true, strokeThickness: 3,
        });
        if (GameState.highscore > 0) {
            this.tweens.add({ targets: hs, scale: 1.08, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }

        // Buttons
        new CartoonButton(this, cx, 810, 'PLAY', {
            variant: 'primary', width: 300, height: 88, fontSize: 40, wobble: true,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('BuildScene'));
            },
        });

        new CartoonButton(this, cx, 920, 'ACHIEVEMENTS', {
            variant: 'secondary', width: 260, height: 64, fontSize: 22,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('AchievementsScene'));
            },
        });

        // Sound controls
        this.createVolumeControl(cx, 1020, 'MUSIC', GameState.musicVolume, GameState.musicMuted,
            (vol) => {
                GameState.musicVolume = vol;
                (this.soundtrack as unknown as { setVolume: (v: number) => void }).setVolume(GameState.getMusicVolume());
                GameState.save();
            },
            (muted) => {
                GameState.musicMuted = muted;
                (this.soundtrack as unknown as { setVolume: (v: number) => void }).setVolume(GameState.getMusicVolume());
                GameState.save();
            },
        );
        this.createVolumeControl(cx, 1100, 'SFX', GameState.sfxVolume, GameState.sfxMuted,
            (vol) => { GameState.sfxVolume = vol; GameState.save(); },
            (muted) => { GameState.sfxMuted = muted; GameState.save(); },
        );

        label(this, cx, 1230, 'MACHINES JAM 2026', 16, { color: HEX.accentLilac, strokeThickness: 0 });

        warpIn(this);
    }

    private createVolumeControl(
        cx: number, y: number, labelText: string,
        initialVolume: number, initialMuted: boolean,
        onVolumeChange: (vol: number) => void,
        onMuteToggle: (muted: boolean) => void,
    ) {
        let volume = initialVolume;
        let muted = initialMuted;

        label(this, cx - 180, y, labelText, 18, { color: HEX.accentLilac, strokeThickness: 0 }).setOrigin(0, 0.5);

        const trackX = cx - 60;
        const trackW = 220;
        this.add.image(trackX + trackW / 2, y, 'ui_slide_track').setDisplaySize(trackW, 14);
        const fill = this.add.image(trackX, y, 'ui_slide_fill').setOrigin(0, 0.5);
        fill.setDisplaySize(trackW * volume, 14);

        const handle = this.add.circle(trackX + trackW * volume, y, 14, COLORS.accentWarm)
            .setStrokeStyle(3, COLORS.ink)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);
        this.input.setDraggable(handle);

        const hitZone = this.add.rectangle(trackX, y, trackW, 40, 0, 0)
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true });

        hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.playClick();
            const localX = pointer.x - trackX;
            volume = PhaserMath.Clamp(localX / trackW, 0, 1);
            handle.setX(trackX + trackW * volume);
            fill.setDisplaySize(trackW * volume, 14);
            onVolumeChange(volume);
        });

        this.input.on('drag', (_p: Phaser.Input.Pointer, obj: GameObjects.GameObject, dragX: number) => {
            if (obj !== handle) return;
            const clamped = PhaserMath.Clamp(dragX, trackX, trackX + trackW);
            handle.setX(clamped);
            volume = (clamped - trackX) / trackW;
            fill.setDisplaySize(trackW * volume, 14);
            onVolumeChange(volume);
        });

        const toggle = new CartoonButton(this, trackX + trackW + 60, y, muted ? 'OFF' : 'ON', {
            variant: muted ? 'ghost' : 'secondary', width: 72, height: 36, fontSize: 16,
            onClick: () => {
                muted = !muted;
                toggle.setText(muted ? 'OFF' : 'ON');
                onMuteToggle(muted);
            },
        });
    }
}
```

- [ ] **Step 2: Visual verification**

Run `npm run dev`. Open `http://localhost:8080`. Expected:
- Deep space gradient, stars, rotating planet bottom-right, occasional shooting stars.
- Rocket bobbing with cyan thruster particles.
- Title "ROCKET BUILDER" in KenneyFuture with ink outline, entry bounce.
- Highscore chip with pulsing star.
- PLAY button primary cyan with wobble; ACHIEVEMENTS secondary yellow; both have hover/press feedback.
- Click PLAY → warp streaks out, BuildScene loads.
- Click ACHIEVEMENTS → same transition, AchievementsScene loads.
- Volume sliders work (drag + click track); mute toggle flips label.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/MenuScene.ts
git commit -m "feat(ui): rebuild MenuScene with cartoon-cosmic design system"
```

---

## Task 9: Rebuild AchievementsScene

**Files:**
- Modify: `src/game/scenes/AchievementsScene.ts` (full replacement)

- [ ] **Step 1: Replace AchievementsScene contents**

```typescript
// src/game/scenes/AchievementsScene.ts
import { Scene } from 'phaser';
import { GameState } from '../GameState';
import { ACHIEVEMENTS } from '../systems/AchievementManager';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut } from '../ui/SceneTransition';
import { title, label, panel } from '../ui/typography';
import { COLORS, HEX } from '../ui/colors';

export class AchievementsScene extends Scene {
    constructor() {
        super('AchievementsScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        const cx = 360;

        const starfield = new StarfieldBackground(this, { density: 0.8 });
        starfield.addAccent('constellations');

        // Title
        const t = title(this, cx, 90, 'ACHIEVEMENTS', 56, { color: HEX.accentWarm, strokeThickness: 7 });
        t.setScale(0);
        this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.easeOut' });

        // Progress chip
        const unlockedCount = GameState.unlockedAchievements.length;
        panel(this, cx, 160, 280, 48);
        const counter = label(this, cx, 160, `0 / ${ACHIEVEMENTS.length} UNLOCKED`, 20, {
            color: HEX.accentWarm, bold: true, strokeThickness: 3,
        });
        this.tweens.addCounter({
            from: 0,
            to: unlockedCount,
            duration: 600,
            onUpdate: tween => counter.setText(`${Math.round(tween.getValue())} / ${ACHIEVEMENTS.length} UNLOCKED`),
        });

        const startY = 240;
        const spacing = 110;

        ACHIEVEMENTS.forEach((ach, i) => {
            const y = startY + i * spacing;
            const unlocked = GameState.unlockedAchievements.includes(ach.id);

            const card = this.add.container(800, y); // starts off-screen right
            const bgColor = unlocked ? COLORS.paper : COLORS.bgMid;
            const bgAlpha = unlocked ? 0.12 : 0.4;

            const g = this.add.graphics();
            g.fillStyle(bgColor, bgAlpha);
            g.fillRoundedRect(-300, -45, 600, 90, 16);
            g.lineStyle(4, COLORS.ink, 1);
            g.strokeRoundedRect(-300, -45, 600, 90, 16);
            card.add(g);

            if (unlocked) {
                const star = this.add.text(-250, 0, '★', {
                    fontFamily: 'KenneyFuture, sans-serif',
                    fontSize: '48px',
                    color: HEX.accentWarm,
                    stroke: HEX.ink,
                    strokeThickness: 4,
                }).setOrigin(0.5);
                this.tweens.add({ targets: star, rotation: Math.PI * 2, duration: 20000, repeat: -1 });
                card.add(star);
            } else {
                const lock = this.add.text(-250, 0, '■', {
                    fontFamily: 'KenneyFuture, sans-serif',
                    fontSize: '40px',
                    color: HEX.accentLilac,
                    stroke: HEX.ink,
                    strokeThickness: 3,
                }).setOrigin(0.5);
                card.add(lock);
            }

            const nameText = this.add.text(-200, -14, ach.name, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '22px',
                color: unlocked ? HEX.paper : HEX.accentLilac,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0, 0.5);
            card.add(nameText);

            const desc = ach.gearsThreshold !== undefined
                ? `Collect ${ach.gearsThreshold.toLocaleString()} gears in one flight`
                : `Reach ${ach.altitudeThreshold!.toLocaleString()} altitude`;
            const descText = this.add.text(-200, 18, desc, {
                fontFamily: '"Trebuchet MS", sans-serif',
                fontSize: '14px',
                color: unlocked ? HEX.accentLilac : '#888',
            }).setOrigin(0, 0.5);
            card.add(descText);

            this.tweens.add({
                targets: card,
                x: cx,
                delay: i * 80,
                duration: 400,
                ease: 'Back.easeOut',
            });
        });

        // Back button
        new CartoonButton(this, cx, 1180, '< BACK', {
            variant: 'ghost', width: 220, height: 64, fontSize: 24,
            onClick: () => {
                this.playClick();
                warpOut(this, () => this.scene.start('MenuScene'));
            },
        });

        warpIn(this);
    }
}
```

- [ ] **Step 2: Visual verification**

Run `npm run dev`. Navigate Menu → ACHIEVEMENTS. Expected:
- Title bounces in, counter ticks from 0 to unlocked count.
- Cards stagger in from the right.
- Unlocked cards show rotating ★ + bright name; locked show muted lock + lilac text.
- Starfield + constellation lines visible behind.
- BACK button → warp → Menu.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/AchievementsScene.ts
git commit -m "feat(ui): rebuild AchievementsScene with cartoon-cosmic cards"
```

---

## Task 10: Rebuild BuildScene

**Files:**
- Modify: `src/game/scenes/BuildScene.ts` (full replacement)

- [ ] **Step 1: Replace BuildScene contents**

```typescript
// src/game/scenes/BuildScene.ts
import { Scene, GameObjects } from 'phaser';
import { GameState } from '../GameState';
import { PARTS, getPartsForSlot, BUILD_BUDGET, SlotType, PartDef } from '../parts';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { warpIn, warpOut, rocketLiftoff } from '../ui/SceneTransition';
import { title, label, panel } from '../ui/typography';
import { burst } from '../ui/Confetti';
import { COLORS, HEX } from '../ui/colors';

interface SlotUI {
    key: 'nose' | 'body' | 'engine' | 'leftModule' | 'rightModule';
    label: string;
    slotType: SlotType;
    x: number;
    y: number;
    w: number;
    h: number;
}

const SLOTS: SlotUI[] = [
    { key: 'nose', label: 'NOSE', slotType: 'nose', x: 360, y: 300, w: 96, h: 72 },
    { key: 'body', label: 'BODY', slotType: 'body', x: 360, y: 430, w: 120, h: 120 },
    { key: 'leftModule', label: 'LEFT', slotType: 'module', x: 220, y: 430, w: 84, h: 84 },
    { key: 'rightModule', label: 'RIGHT', slotType: 'module', x: 500, y: 430, w: 84, h: 84 },
    { key: 'engine', label: 'ENGINE', slotType: 'engine', x: 360, y: 590, w: 120, h: 96 },
];

export class BuildScene extends Scene {
    private budgetText!: GameObjects.Text;
    private gearsText!: GameObjects.Text;
    private slotLabels: Map<string, GameObjects.Text> = new Map();
    private slotGraphics: Map<string, GameObjects.Graphics> = new Map();
    private partPanel: GameObjects.Container | null = null;
    private launchBtn!: CartoonButton;
    private soundtrack!: Phaser.Sound.BaseSound;
    private starfield!: StarfieldBackground;

    constructor() {
        super('BuildScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        this.soundtrack = this.sound.add('soundtrack', { loop: true, volume: GameState.getMusicVolume() });
        this.soundtrack.play();
        this.events.on('shutdown', () => this.soundtrack.stop());

        this.starfield = new StarfieldBackground(this, { density: 0.4 });
        this.starfield.addAccent('blueprint');

        // Header
        panel(this, 110, 50, 200, 48);
        this.budgetText = this.add.text(110, 50, '', {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '20px',
            color: HEX.paper,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(0.5);

        panel(this, 610, 50, 180, 48);
        const gearIcon = this.add.image(555, 50, 'gear').setScale(0.35);
        this.tweens.add({ targets: gearIcon, rotation: Math.PI * 2, duration: 6000, repeat: -1 });
        this.gearsText = this.add.text(630, 50, '', {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '20px',
            color: HEX.accentWarm,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(0.5);

        title(this, 360, 140, 'BUILD YOUR ROCKET', 36, { color: HEX.accentPink, strokeThickness: 5, rotation: -0.017 });

        // Rocket silhouette connectors
        const lines = this.add.graphics();
        lines.lineStyle(4, COLORS.ink, 0.5);
        lines.lineBetween(360, 300, 360, 590);
        lines.lineBetween(360, 430, 220, 430);
        lines.lineBetween(360, 430, 500, 430);

        // Slots
        for (const slot of SLOTS) {
            const g = this.add.graphics();
            this.slotGraphics.set(slot.key, g);

            const lbl = this.add.text(slot.x, slot.y, slot.label, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '18px',
                color: HEX.accentCyan,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0.5);
            this.slotLabels.set(slot.key, lbl);

            const hit = this.add.rectangle(slot.x, slot.y, slot.w, slot.h, 0, 0)
                .setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                this.playClick();
                this.openPartPanel(slot);
            });
            hit.on('pointerover', () => this.drawSlot(slot, true));
            hit.on('pointerout', () => this.drawSlot(slot, false));

            // Desynced idle wobble
            this.tweens.add({
                targets: lbl,
                angle: Phaser.Math.Between(-1, 1),
                duration: 4000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.inOut',
            });
        }

        // Launch button
        this.launchBtn = new CartoonButton(this, 360, 820, '▲ LAUNCH', {
            variant: 'secondary', width: 340, height: 96, fontSize: 36, wobble: true,
            onClick: () => { this.playClick(); this.launch(); },
        });

        // Back button
        new CartoonButton(this, 110, 1230, '< MENU', {
            variant: 'ghost', width: 160, height: 52, fontSize: 20,
            onClick: () => { this.playClick(); warpOut(this, () => this.scene.start('MenuScene')); },
        });

        this.refreshUI();
        warpIn(this);
    }

    private drawSlot(slot: SlotUI, hover: boolean) {
        const g = this.slotGraphics.get(slot.key)!;
        const partId = GameState.rocketConfig[slot.key];
        const overBudget = GameState.getBudgetUsed() > BUILD_BUDGET;
        const fill = partId ? 0x00ff88 : COLORS.accentCyan;
        const alpha = hover ? 0.25 : 0.1;
        g.clear();
        g.fillStyle(overBudget ? COLORS.accentPink : fill, alpha);
        g.fillRoundedRect(slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 10);
        g.lineStyle(4, COLORS.ink, 1);
        g.strokeRoundedRect(slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 10);
    }

    private refreshUI() {
        const used = GameState.getBudgetUsed();
        this.budgetText.setText(`BUDGET ${used}/${BUILD_BUDGET}`);
        this.budgetText.setColor(used > BUILD_BUDGET ? HEX.accentPink : HEX.paper);
        this.gearsText.setText(`${GameState.currency}G`);

        for (const slot of SLOTS) {
            const partId = GameState.rocketConfig[slot.key];
            const lbl = this.slotLabels.get(slot.key)!;
            if (partId) {
                const part = PARTS[partId];
                lbl.setText(part.name);
                lbl.setColor(HEX.paper);
            } else {
                lbl.setText(slot.label);
                lbl.setColor(HEX.accentCyan);
            }
            this.drawSlot(slot, false);
        }

        const hasEngine = !!GameState.rocketConfig.engine;
        const overBudget = GameState.getBudgetUsed() > BUILD_BUDGET;
        this.launchBtn.setEnabled(hasEngine && !overBudget);
    }

    private openPartPanel(slot: SlotUI) {
        this.closePartPanel();

        const parts = getPartsForSlot(slot.slotType);
        const extraRow = slot.slotType === 'module' ? 1 : 0;
        const rows = parts.length + extraRow;
        const panelH = rows * 76 + 80;
        const panelY = 1280 - panelH / 2 - 20;
        const container = this.add.container(360, 1280);

        const bg = this.add.nineslice(0, 0, 'ui_panel', 0, 640, panelH, 16, 16, 16, 16);
        container.add(bg);

        const t = this.add.text(0, -panelH / 2 + 28, `SELECT ${slot.label}`, {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '24px',
            color: HEX.accentPink,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(0.5, 0.5);
        container.add(t);

        let cursorY = -panelH / 2 + 70;

        if (slot.slotType === 'module') {
            const emptyBtn = this.add.text(0, cursorY + 28, '[ EMPTY ]', {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '20px',
                color: HEX.accentLilac,
                stroke: HEX.ink,
                strokeThickness: 3,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            emptyBtn.on('pointerdown', () => {
                this.playClick();
                (GameState.rocketConfig as unknown as Record<string, string | null>)[slot.key] = null;
                this.closePartPanel();
                this.refreshUI();
            });
            container.add(emptyBtn);
            cursorY += 76;
        }

        parts.forEach((part) => {
            const y = cursorY + 28;
            cursorY += 76;

            const unlocked = GameState.isUnlocked(part.id);
            const equipped = GameState.rocketConfig[slot.key] === part.id;
            const color = equipped ? '#00ff88' : unlocked ? HEX.paper : '#888';

            const nameText = this.add.text(-260, y - 10, part.name, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '22px',
                color,
                stroke: HEX.ink,
                strokeThickness: 2,
            });
            container.add(nameText);

            const statsText = this.add.text(-260, y + 18, this.getPartStats(part), {
                fontFamily: '"Trebuchet MS", sans-serif',
                fontSize: '13px',
                color: HEX.accentLilac,
            });
            container.add(statsText);

            const costText = this.add.text(260, y - 10, `$${part.budgetCost}`, {
                fontFamily: 'KenneyFuture, sans-serif',
                fontSize: '20px',
                color: HEX.accentWarm,
                stroke: HEX.ink,
                strokeThickness: 2,
            }).setOrigin(1, 0);
            container.add(costText);

            if (unlocked) {
                nameText.setInteractive({ useHandCursor: true });
                nameText.on('pointerdown', () => {
                    GameState.rocketConfig[slot.key] = part.id;
                    this.sound.play('build', { volume: GameState.getSfxVolume() });
                    this.closePartPanel();
                    this.refreshUI();
                });
                nameText.on('pointerover', () => nameText.setColor(HEX.accentCyan));
                nameText.on('pointerout', () => nameText.setColor(equipped ? '#00ff88' : HEX.paper));
            } else {
                const unlockBtn = this.add.text(260, y + 18, `UNLOCK: ${part.unlockCost}G`, {
                    fontFamily: '"Trebuchet MS", sans-serif',
                    fontSize: '14px',
                    color: GameState.currency >= (part.unlockCost ?? 0) ? HEX.accentWarm : HEX.accentPink,
                }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
                unlockBtn.on('pointerdown', () => {
                    if (GameState.unlockPart(part.id)) {
                        this.sound.play('buy', { volume: GameState.getSfxVolume() });
                        burst(this, 360, y + panelY);
                        this.closePartPanel();
                        this.openPartPanel(slot);
                    } else {
                        this.sound.play('error', { volume: GameState.getSfxVolume() });
                    }
                });
                container.add(unlockBtn);
            }
        });

        this.tweens.add({ targets: container, y: panelY, duration: 300, ease: 'Back.easeOut' });
        this.partPanel = container;
    }

    private getPartStats(part: PartDef): string {
        const stats: string[] = [`wt:${part.weight}`];
        if (part.drag !== undefined) stats.push(`drag:${part.drag}`);
        if (part.hp !== undefined) stats.push(`hp:${part.hp}`);
        if (part.thrust !== undefined) stats.push(`thrust:${part.thrust}`);
        if (part.control !== undefined) stats.push(`ctrl:${part.control}`);
        if (part.fuelBurn !== undefined) stats.push(`burn:${part.fuelBurn}`);
        if (part.rotationDamping !== undefined) stats.push(`stab:${part.rotationDamping}`);
        if (part.bonusFuel !== undefined) stats.push(`+fuel:${part.bonusFuel}`);
        if (part.shieldHP !== undefined) stats.push(`shield:${part.shieldHP}`);
        return stats.join(' | ');
    }

    private closePartPanel() {
        if (this.partPanel) {
            this.partPanel.destroy();
            this.partPanel = null;
        }
    }

    private launch() {
        const hasEngine = !!GameState.rocketConfig.engine;
        const overBudget = GameState.getBudgetUsed() > BUILD_BUDGET;
        if (!hasEngine || overBudget) return;

        // Build a liftoff sprite from the rocket image (simple proxy for the silhouette).
        const liftoff = this.add.image(360, 430, 'rocket').setScale(1.4);
        rocketLiftoff(this, liftoff, () => this.scene.start('FlightScene'));
    }
}
```

- [ ] **Step 2: Visual verification**

Run `npm run dev`. Navigate Menu → PLAY → BuildScene. Expected:
- Blueprint grid with rotating gears in corners, stars in background.
- Budget/gears chips top, title pink with outline.
- Slot outlines connect as rocket silhouette; click a slot opens bottom sheet with cards.
- Lock/unlock flow works; buying emits confetti.
- LAUNCH disabled until valid (engine + budget ok); click → rocket image flies up → FlightScene.
- < MENU → warp → Menu.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/BuildScene.ts
git commit -m "feat(ui): rebuild BuildScene with cartoon-cosmic slots and liftoff"
```

---

## Task 11: Rebuild CrashScene

**Files:**
- Modify: `src/game/scenes/CrashScene.ts` (full replacement)

- [ ] **Step 1: Replace CrashScene contents**

```typescript
// src/game/scenes/CrashScene.ts
import { Scene } from 'phaser';
import { GameState } from '../GameState';
import { getAchievementName } from '../systems/AchievementManager';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { CartoonButton } from '../ui/CartoonButton';
import { flashShake, warpOut } from '../ui/SceneTransition';
import { title, label, panel } from '../ui/typography';
import { burst } from '../ui/Confetti';
import { COLORS, HEX } from '../ui/colors';

export class CrashScene extends Scene {
    constructor() {
        super('CrashScene');
    }

    private playClick() {
        this.sound.play('click', { volume: GameState.getSfxVolume() });
    }

    create() {
        const cx = 360;
        const run = GameState.lastRun;
        const isNewHighscore = run.score >= GameState.highscore && run.score > 0;

        const starfield = new StarfieldBackground(this, { density: 0.6 });
        starfield.addAccent('meteor');

        // Flash+shake entry
        const content = this.add.container(0, 0);
        content.setAlpha(0);

        flashShake(this, () => {
            this.tweens.add({ targets: content, alpha: 1, duration: 400 });
        });

        // Crash title
        const crashTitle = title(this, cx, 220, 'CRASH!', 84, { color: HEX.accentPink, strokeThickness: 9 });
        crashTitle.setScale(0);
        this.tweens.add({
            targets: crashTitle, scale: 1, duration: 500, ease: 'Back.easeOut',
            onComplete: () => this.cameras.main.shake(200, 0.005),
        });
        content.add(crashTitle);

        // Wrecked rocket
        const wreck = this.add.image(cx, 320, 'rocket').setAngle(-40).setScale(0.9);
        content.add(wreck);
        for (let i = 0; i < 8; i++) {
            const p = this.add.circle(cx + Phaser.Math.Between(-40, 40), 330, 4, COLORS.accentLilac, 0.8);
            this.tweens.add({
                targets: p, y: 250 - i * 20, alpha: 0, duration: 1800 + i * 120,
                onComplete: () => p.destroy(),
            });
            content.add(p);
        }

        // Stats panel
        const statsPanel = panel(this, cx, 600, 560, 360);
        content.add(statsPanel);

        const altText = label(this, cx - 220, 470, 'MAX ALTITUDE: 0', 22, { color: HEX.paper, bold: true, strokeThickness: 3 }).setOrigin(0, 0.5);
        content.add(altText);
        this.tweens.addCounter({
            from: 0, to: run.altitude, duration: 800,
            onUpdate: tw => altText.setText(`MAX ALTITUDE: ${Math.round(tw.getValue())}`),
        });

        const gearsText = label(this, cx - 220, 530, 'GEARS COLLECTED: 0', 22, { color: HEX.accentWarm, bold: true, strokeThickness: 3 }).setOrigin(0, 0.5);
        content.add(gearsText);
        this.tweens.addCounter({
            from: 0, to: run.gears, duration: 800,
            onUpdate: tw => gearsText.setText(`GEARS COLLECTED: ${Math.round(tw.getValue())}`),
        });

        // Dashed separator
        const sep = this.add.graphics();
        sep.lineStyle(2, COLORS.ink, 1);
        for (let x = cx - 220; x < cx + 220; x += 14) {
            sep.lineBetween(x, 575, x + 8, 575);
        }
        content.add(sep);

        const scoreText = label(this, cx, 630, 'SCORE: 0', 40, { color: HEX.accentCyan, bold: true, strokeThickness: 5 });
        content.add(scoreText);
        this.tweens.addCounter({
            from: 0, to: run.score, duration: 1200,
            onUpdate: tw => scoreText.setText(`SCORE: ${Math.round(tw.getValue())}`),
        });

        const hsText = label(this, cx - 220, 700, `HIGHSCORE: ${GameState.highscore}`, 18, {
            color: HEX.accentLilac, strokeThickness: 0,
        }).setOrigin(0, 0.5);
        const walletText = label(this, cx + 220, 700, `${GameState.currency}G`, 18, {
            color: HEX.accentWarm, bold: true, strokeThickness: 3,
        }).setOrigin(1, 0.5);
        content.add([hsText, walletText]);

        if (isNewHighscore) {
            this.time.delayedCall(1300, () => {
                const chip = label(this, cx, 750, '★ NEW HIGHSCORE ★', 24, {
                    color: HEX.accentWarm, bold: true, strokeThickness: 4,
                });
                chip.setScale(0);
                this.tweens.add({ targets: chip, scale: 1, duration: 400, ease: 'Back.easeOut' });
                burst(this, cx, 750, { count: 40, spread: 300 });
                content.add(chip);
            });
        }

        // Buttons
        const rebuild = new CartoonButton(this, cx, 890, '▲ REBUILD', {
            variant: 'primary', width: 320, height: 88, fontSize: 32, wobble: true,
            onClick: () => { this.playClick(); warpOut(this, () => this.scene.start('BuildScene')); },
        });
        content.add(rebuild.container);

        const menu = new CartoonButton(this, cx, 1000, 'MENU', {
            variant: 'ghost', width: 200, height: 60, fontSize: 22,
            onClick: () => { this.playClick(); warpOut(this, () => this.scene.start('MenuScene')); },
        });
        content.add(menu.container);

        // Achievement toasts
        if (GameState.pendingAchievementNotifications.length > 0) {
            const unlocked = [...GameState.pendingAchievementNotifications];
            GameState.pendingAchievementNotifications = [];
            unlocked.forEach((id, i) => this.showAchievementToast(id, i));
        }
    }

    private showAchievementToast(achievementId: string, index: number) {
        const cx = 360;
        const screenH = this.cameras.main.height;
        const bannerY = screenH + 40;
        const targetY = screenH - 80 - index * 80;
        const name = getAchievementName(achievementId);

        const bg = this.add.nineslice(cx, bannerY, 'ui_panel', 0, 520, 60, 16, 16, 16, 16).setOrigin(0.5);
        const star = this.add.text(cx - 230, bannerY, '★', {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '28px',
            color: HEX.accentWarm,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(0.5);
        const text = this.add.text(cx + 20, bannerY, `ACHIEVEMENT: ${name}`, {
            fontFamily: 'KenneyFuture, sans-serif',
            fontSize: '18px',
            color: HEX.accentWarm,
            stroke: HEX.ink,
            strokeThickness: 3,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: [bg, star, text],
            y: targetY,
            duration: 500,
            delay: index * 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                burst(this, cx, targetY, { count: 20 });
                this.tweens.add({ targets: star, rotation: Math.PI * 2, duration: 3000, repeat: -1 });
            },
        });
        this.time.delayedCall(3500 + index * 200, () => {
            this.tweens.add({
                targets: [bg, star, text], alpha: 0, duration: 500,
                onComplete: () => { bg.destroy(); star.destroy(); text.destroy(); },
            });
        });
    }
}
```

- [ ] **Step 2: Visual verification**

Run `npm run dev`. Play a run (Menu → PLAY → launch a rocket → crash) to reach CrashScene. Expected:
- White flash + shake on entry.
- "CRASH!" bounces in pink. Tilted rocket with drifting smoke particles.
- Stats panel with counter tweens on altitude, gears, score.
- If you beat highscore: "NEW HIGHSCORE" chip fades in with confetti.
- REBUILD primary cyan (wobble) → BuildScene; MENU ghost → MenuScene (both with warp).
- If you unlocked an achievement this run: toast slides up with confetti and spinning star.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/CrashScene.ts
git commit -m "feat(ui): rebuild CrashScene with cartoon-cosmic report card"
```

---

## Task 12: Cross-scene integration pass

**Files:**
- No new files; verification + minor fixes only.

- [ ] **Step 1: Smoke test full navigation loop**

Run `npm run dev`. Walk through:
1. Menu → PLAY → Build → click slots → buy a locked part → equip → LAUNCH → Flight → crash into terrain → Crash → REBUILD → Build → back to MENU.
2. Menu → ACHIEVEMENTS → back.
3. Toggle MUSIC/SFX mute and volume; reload page; confirm values persisted.

Note any visual glitches, misaligned elements, TypeScript errors in console. Fix them inline (adjust coordinates, typos, font sizes) and record the fix in a single commit.

- [ ] **Step 2: Build production bundle**

Run: `npm run build`
Expected: Vite build completes with no TypeScript errors. If errors appear, fix them.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(ui): polish pass after scene redesign integration"
```

(If no changes, skip the commit.)

---

## Out of scope reminders

- FlightScene and HUDScene are not redesigned.
- No gameplay, parts, or achievement logic changes.
- No new audio or image assets required.
- Unlock timestamps are not added to GameState.
