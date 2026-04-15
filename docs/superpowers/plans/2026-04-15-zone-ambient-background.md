# Zone Ambient Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać dekoracyjne animacje tła per-zone w FlightScene (chmury w atmosferze, burza w turbulence, gwiazdy/meteory/planety w kosmosie) z płynnymi fade-in/out przejściami.

**Architecture:** Nowy system `ZoneAmbient` (klasa w `src/game/systems/`) tworzony w `FlightScene.create()`, wywoływany z `update()`. Używa wyłącznie Graphics/Arc/Rectangle (bez nowych assetów), bez fizyki, osobny Container z depth `-10`. Parallax via `setScrollFactor`.

**Tech Stack:** Phaser 4, TypeScript. Brak frameworka testowego — weryfikacja przez `npm run dev` + obserwacja wizualna.

**Spec:** `docs/superpowers/specs/2026-04-15-zone-ambient-background-design.md`

**Preferencja użytkownika:** NIE commitować automatycznie. Po każdym zadaniu raportować co zmienione, commit robi użytkownik.

---

## File Structure

- **Create:** `src/game/systems/ZoneAmbient.ts` — cała logika: klasa `ZoneAmbient`, interfejs `AmbientElement`, metody spawn/update/cleanup/transition, rendery per-typ
- **Modify:** `src/game/scenes/FlightScene.ts` — import, pole `zoneAmbient`, instancja w `create()`, `update()` wywołanie, `destroy()` w cleanup

Jeden plik dla całego systemu, bo zakres jest mały i metody spawnujące każdy typ są krótkie (~15-30 linii każda). Przekroczenie ~500 linii = sygnał do rozbicia, ale nie przewidujemy tyle.

---

## Task 1: Scaffolding klasy ZoneAmbient

**Files:**
- Create: `src/game/systems/ZoneAmbient.ts`

- [ ] **Step 1: Utworzyć plik z pustą klasą**

```ts
import { GameObjects, Scene, Math as PhaserMath } from 'phaser';

type Zone = 'atmosphere' | 'turbulence' | 'space';

interface AmbientElement {
    obj: GameObjects.GameObject;
    type: string;
    driftX?: number;
}

export class ZoneAmbient {
    private scene: Scene;
    private container: GameObjects.Container;
    private currentZone: Zone = 'atmosphere';
    private activeElements: AmbientElement[] = [];
    private fadingOutElements: AmbientElement[] = [];
    private spawnTimers: Record<string, number> = {};

    constructor(scene: Scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0);
        this.container.setDepth(-10);
    }

    update(_delta: number, _altitude: number, _cameraX: number, _cameraY: number): void {
        // wypełnimy w kolejnych taskach
    }

    destroy(): void {
        for (const e of [...this.activeElements, ...this.fadingOutElements]) {
            e.obj.destroy();
        }
        this.activeElements = [];
        this.fadingOutElements = [];
        this.container.destroy();
    }

    private zoneFromAltitude(altitude: number): Zone {
        if (altitude < 5000) return 'atmosphere';
        if (altitude < 15000) return 'turbulence';
        return 'space';
    }
}
```

- [ ] **Step 2: Weryfikacja**

Run: `npx tsc --noEmit`
Expected: brak błędów typów.

- [ ] **Step 3: Raport**

Wypisać co zostało dodane; nie commitować.

---

## Task 2: Integracja z FlightScene

**Files:**
- Modify: `src/game/scenes/FlightScene.ts`

- [ ] **Step 1: Dodać import i pole**

W `src/game/scenes/FlightScene.ts` na górze, po istniejącym imporcie `ZoneManager`:

```ts
import { ZoneAmbient } from "../systems/ZoneAmbient";
```

W sekcji pól klasy (po `private zoneManager!: ZoneManager;`, linia 10):

```ts
  private zoneAmbient!: ZoneAmbient;
```

- [ ] **Step 2: Stworzyć instancję w create()**

W `create()` bezpośrednio po `this.zoneManager = new ZoneManager(this);` (linia 73):

```ts
    this.zoneAmbient = new ZoneAmbient(this);
```

- [ ] **Step 3: Wywołać update**

W `update()` po linii `this.zoneManager.update(delta, this.altitude, this.rocket.body.position.x);` (linia 256):

```ts
    this.zoneAmbient.update(
      delta,
      this.altitude,
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
    );
```

- [ ] **Step 4: Cleanup przy crash/shutdown**

Znaleźć `this.zoneManager.destroy();` (linia 524). Dodać zaraz po:

```ts
      this.zoneAmbient.destroy();
```

- [ ] **Step 5: Weryfikacja**

Run: `npx tsc --noEmit`
Expected: brak błędów.

Run: `npm run dev`
Expected: gra działa jak wcześniej, FlightScene uruchamia się bez wyjątków (ZoneAmbient nic jeszcze nie rysuje).

- [ ] **Step 6: Raport**

Zmiany: `FlightScene.ts` + `ZoneAmbient.ts` (scaffold). Brak commita.

---

## Task 3: Detekcja zmiany strefy + transition logic (fade-out)

**Files:**
- Modify: `src/game/systems/ZoneAmbient.ts`

- [ ] **Step 1: Dodać detekcję zmiany strefy w update()**

W `src/game/systems/ZoneAmbient.ts`, zastąpić body `update()`:

```ts
    update(delta: number, altitude: number, cameraX: number, cameraY: number): void {
        const newZone = this.zoneFromAltitude(altitude);
        if (newZone !== this.currentZone) {
            this.transitionTo(newZone);
        }

        this.updateFadingOut();
        this.updateActive(delta, cameraX, cameraY);
    }
```

- [ ] **Step 2: Dodać transitionTo()**

Jako nową prywatną metodę:

```ts
    private transitionTo(newZone: Zone): void {
        for (const e of this.activeElements) {
            this.scene.tweens.add({
                targets: e.obj,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    e.obj.destroy();
                    const idx = this.fadingOutElements.indexOf(e);
                    if (idx >= 0) this.fadingOutElements.splice(idx, 1);
                },
            });
            this.fadingOutElements.push(e);
        }
        this.activeElements = [];
        this.spawnTimers = {};
        this.currentZone = newZone;
    }
```

- [ ] **Step 3: Dodać puste updateFadingOut / updateActive**

Też jako prywatne:

```ts
    private updateFadingOut(): void {
        // tweeny same destroyują elementy, nic tu nie trzeba
    }

    private updateActive(_delta: number, _cameraX: number, _cameraY: number): void {
        // wypełniane w Task 4+
    }
```

- [ ] **Step 4: Weryfikacja**

Run: `npx tsc --noEmit`
Expected: brak błędów.

Run: `npm run dev` — polecieć, przekroczyć 5000 i 15000. Nic nie powinno się wizualnie stać (brak elementów aktywnych), ale gra działa, brak exceptionów w konsoli.

- [ ] **Step 5: Raport**

---

## Task 4: Atmosphere — chmury

**Files:**
- Modify: `src/game/systems/ZoneAmbient.ts`

- [ ] **Step 1: Dodać spawn chmur**

Dodać prywatne pola (obok `spawnTimers`):

```ts
    private readonly screenW = 720;
    private readonly screenH = 1280;
```

Dodać metodę:

```ts
    private spawnCloud(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * (this.screenW / 2 + 100);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 200);

        const g = this.scene.add.graphics();
        g.fillStyle(0xffffff, 0.5);
        const w = PhaserMath.Between(120, 220);
        const h = PhaserMath.Between(40, 70);
        g.fillEllipse(0, 0, w, h);
        g.fillEllipse(-w * 0.3, -h * 0.2, w * 0.6, h * 0.7);
        g.fillEllipse(w * 0.3, -h * 0.15, w * 0.5, h * 0.6);
        g.setPosition(x, y);
        g.setScrollFactor(PhaserMath.FloatBetween(0.4, 0.7));
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({ targets: g, alpha: 0.5, duration: 600 });

        const drift = (side === -1 ? 1 : -1) * PhaserMath.FloatBetween(15, 30);
        this.activeElements.push({ obj: g, type: 'cloud', driftX: drift });
    }
```

- [ ] **Step 2: Rozbudować updateActive() o obsługę atmosphere**

Zastąpić `updateActive()`:

```ts
    private updateActive(delta: number, cameraX: number, cameraY: number): void {
        // Dryf + cleanup
        for (let i = this.activeElements.length - 1; i >= 0; i--) {
            const e = this.activeElements[i];
            if (e.driftX && e.obj instanceof GameObjects.Graphics) {
                e.obj.x += (e.driftX * delta) / 1000;
            }
            const obj = e.obj as unknown as { x?: number; y?: number };
            if (
                obj.x !== undefined && obj.y !== undefined &&
                (Math.abs(obj.x - cameraX - this.screenW / 2) > 1500 ||
                 Math.abs(obj.y - cameraY - this.screenH / 2) > 1500)
            ) {
                e.obj.destroy();
                this.activeElements.splice(i, 1);
            }
        }

        // Spawn zgodnie ze strefą
        this.spawnTimers.default = (this.spawnTimers.default ?? 0) + delta;
        if (this.currentZone === 'atmosphere') {
            this.updateAtmosphere(delta, cameraX, cameraY);
        }
    }

    private updateAtmosphere(delta: number, cameraX: number, cameraY: number): void {
        const clouds = this.activeElements.filter(e => e.type === 'cloud').length;
        this.spawnTimers.cloud = (this.spawnTimers.cloud ?? 3000) + delta;
        if (clouds < 4 && this.spawnTimers.cloud >= PhaserMath.Between(2500, 4000)) {
            this.spawnTimers.cloud = 0;
            this.spawnCloud(cameraX, cameraY);
        }
    }
```

- [ ] **Step 3: Weryfikacja**

Run: `npx tsc --noEmit`
Expected: brak błędów.

Run: `npm run dev` — zbudować rakietę, wystartować. Oczekiwane: chmury pojawiają się z boków, dryfują, znikają za ekranem. Gdy przekroczysz 5000m → chmury robią fade-out.

- [ ] **Step 4: Raport**

---

## Task 5: Atmosphere — ptak

**Files:**
- Modify: `src/game/systems/ZoneAmbient.ts`

- [ ] **Step 1: Dodać spawnBird()**

```ts
    private spawnBird(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * (this.screenW / 2 + 80);
        const y = cameraY + PhaserMath.Between(150, 600);

        const g = this.scene.add.graphics();
        g.lineStyle(2, 0x222222, 0.7);
        g.beginPath();
        g.moveTo(-10, 0);
        g.lineTo(0, -5);
        g.lineTo(10, 0);
        g.strokePath();
        g.setPosition(x, y);
        g.setScrollFactor(0.5);
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({ targets: g, alpha: 0.7, duration: 600 });

        const drift = (side === -1 ? 1 : -1) * PhaserMath.FloatBetween(40, 70);
        this.activeElements.push({ obj: g, type: 'bird', driftX: drift });
    }
```

- [ ] **Step 2: Dodać spawn w updateAtmosphere()**

Na końcu `updateAtmosphere()`:

```ts
        const birds = this.activeElements.filter(e => e.type === 'bird').length;
        this.spawnTimers.bird = (this.spawnTimers.bird ?? 0) + delta;
        if (birds < 1 && this.spawnTimers.bird >= PhaserMath.Between(8000, 12000)) {
            this.spawnTimers.bird = 0;
            this.spawnBird(cameraX, cameraY);
        }
```

- [ ] **Step 3: Weryfikacja**

Run: `npx tsc --noEmit` + `npm run dev`.
Expected: co ~8-12s przelatuje pojedynczy ptak przez ekran w atmosferze.

- [ ] **Step 4: Raport**

---

## Task 6: Turbulence — ciemne chmury + błyskawice

**Files:**
- Modify: `src/game/systems/ZoneAmbient.ts`

- [ ] **Step 1: spawnStormCloud()**

```ts
    private spawnStormCloud(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * (this.screenW / 2 + 100);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 200);

        const g = this.scene.add.graphics();
        g.fillStyle(0x2a2a3a, 0.75);
        const w = PhaserMath.Between(180, 280);
        const h = PhaserMath.Between(60, 90);
        g.fillEllipse(0, 0, w, h);
        g.fillEllipse(-w * 0.3, -h * 0.2, w * 0.6, h * 0.7);
        g.fillEllipse(w * 0.3, -h * 0.15, w * 0.5, h * 0.6);
        g.setPosition(x, y);
        g.setScrollFactor(0.5);
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({ targets: g, alpha: 0.75, duration: 600 });

        const drift = (side === -1 ? 1 : -1) * PhaserMath.FloatBetween(10, 20);
        this.activeElements.push({ obj: g, type: 'stormcloud', driftX: drift });
    }
```

- [ ] **Step 2: spawnLightning()**

```ts
    private spawnLightning(cameraX: number, cameraY: number): void {
        const x = cameraX + PhaserMath.Between(50, this.screenW - 50);
        const y = cameraY + PhaserMath.Between(100, 500);

        const g = this.scene.add.graphics();
        g.lineStyle(3, 0xffffff, 1);
        g.beginPath();
        g.moveTo(0, 0);
        let px = 0, py = 0;
        for (let i = 0; i < 5; i++) {
            px += PhaserMath.Between(-15, 15);
            py += PhaserMath.Between(20, 40);
            g.lineTo(px, py);
        }
        g.strokePath();
        g.setPosition(x, y);
        g.setScrollFactor(0.6);
        g.setAlpha(0);
        this.container.add(g);

        // Flash + fade
        this.scene.tweens.add({
            targets: g, alpha: 1, duration: 80,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: g, alpha: 0, duration: 300,
                    onComplete: () => {
                        g.destroy();
                        const idx = this.activeElements.findIndex(e => e.obj === g);
                        if (idx >= 0) this.activeElements.splice(idx, 1);
                    },
                });
            },
        });

        this.activeElements.push({ obj: g, type: 'lightning' });
    }
```

- [ ] **Step 3: updateTurbulence()**

Dodać metodę:

```ts
    private updateTurbulence(delta: number, cameraX: number, cameraY: number): void {
        const clouds = this.activeElements.filter(e => e.type === 'stormcloud').length;
        this.spawnTimers.stormcloud = (this.spawnTimers.stormcloud ?? 0) + delta;
        if (clouds < 3 && this.spawnTimers.stormcloud >= PhaserMath.Between(3000, 5000)) {
            this.spawnTimers.stormcloud = 0;
            this.spawnStormCloud(cameraX, cameraY);
        }

        this.spawnTimers.lightning = (this.spawnTimers.lightning ?? 0) + delta;
        if (this.spawnTimers.lightning >= PhaserMath.Between(4000, 7000)) {
            this.spawnTimers.lightning = 0;
            this.spawnLightning(cameraX, cameraY);
        }
    }
```

W `updateActive()` dopisać obsługę:

```ts
        if (this.currentZone === 'atmosphere') {
            this.updateAtmosphere(delta, cameraX, cameraY);
        } else if (this.currentZone === 'turbulence') {
            this.updateTurbulence(delta, cameraX, cameraY);
        }
```

- [ ] **Step 4: Weryfikacja**

Run: `npx tsc --noEmit` + `npm run dev`. Wznieś się powyżej 5000m. Oczekiwane: stare chmury fade-out, pojawiają się ciemne chmury burzowe, co kilka sekund miga błyskawica.

- [ ] **Step 5: Raport**

---

## Task 7: Space — parallax stars

**Files:**
- Modify: `src/game/systems/ZoneAmbient.ts`

- [ ] **Step 1: spawnSpaceStars() — jednorazowy setup przy wejściu w strefę**

```ts
    private spawnSpaceStars(cameraX: number, cameraY: number): void {
        for (let i = 0; i < 50; i++) {
            const x = cameraX + PhaserMath.Between(-400, this.screenW + 400);
            const y = cameraY + PhaserMath.Between(-400, this.screenH + 400);
            const radius = PhaserMath.FloatBetween(0.8, 2);
            const color = Math.random() < 0.1 ? 0xffcc66 : 0xffffff;
            const alpha = PhaserMath.FloatBetween(0.4, 0.9);

            const s = this.scene.add.circle(x, y, radius, color, 0);
            s.setScrollFactor(0.1);
            this.container.add(s);

            this.scene.tweens.add({ targets: s, alpha, duration: 600 });
            this.activeElements.push({ obj: s, type: 'star' });
        }
    }
```

- [ ] **Step 2: updateSpace() — na razie tylko ensure stars exist**

```ts
    private updateSpace(delta: number, cameraX: number, cameraY: number): void {
        const stars = this.activeElements.filter(e => e.type === 'star').length;
        if (stars === 0) {
            this.spawnSpaceStars(cameraX, cameraY);
        }
    }
```

W `updateActive()` dopisać:

```ts
        } else if (this.currentZone === 'space') {
            this.updateSpace(delta, cameraX, cameraY);
        }
```

- [ ] **Step 3: Wyłączyć cleanup poza ekranem dla gwiazd**

W `updateActive()`, w bloku cleanupu zamienić warunek tak by pomijał typ 'star':

```ts
            if (e.type === 'star') continue;
```

Wstawić to jako pierwsze sprawdzenie wewnątrz pętli dla, przed sprawdzeniem dryfu/pozycji.

Pełne body pętli (zastąpić istniejącą):

```ts
        for (let i = this.activeElements.length - 1; i >= 0; i--) {
            const e = this.activeElements[i];
            if (e.type === 'star') continue;
            if (e.driftX && e.obj instanceof GameObjects.Graphics) {
                e.obj.x += (e.driftX * delta) / 1000;
            }
            const obj = e.obj as unknown as { x?: number; y?: number };
            if (
                obj.x !== undefined && obj.y !== undefined &&
                (Math.abs(obj.x - cameraX - this.screenW / 2) > 1500 ||
                 Math.abs(obj.y - cameraY - this.screenH / 2) > 1500)
            ) {
                e.obj.destroy();
                this.activeElements.splice(i, 1);
            }
        }
```

- [ ] **Step 4: Weryfikacja**

Run: `npx tsc --noEmit` + `npm run dev`. Wznieś się >15000m. Oczekiwane: pojawiają się gwiazdy z mocnym parallaxem (ruszają się bardzo wolno względem rakiety).

- [ ] **Step 5: Raport**

---

## Task 8: Space — meteor

**Files:**
- Modify: `src/game/systems/ZoneAmbient.ts`

- [ ] **Step 1: spawnMeteor()**

```ts
    private spawnMeteor(cameraX: number, cameraY: number): void {
        const x = cameraX + this.screenW + 80;
        const y = cameraY + PhaserMath.Between(-100, this.screenH * 0.6);

        const streak = this.scene.add.rectangle(x, y, 80, 3, 0xffaa66, 0);
        streak.setAngle(30);
        streak.setScrollFactor(0.3);
        this.container.add(streak);

        this.scene.tweens.add({ targets: streak, alpha: 1, duration: 200 });

        this.scene.tweens.add({
            targets: streak,
            x: x - 600,
            y: y + 400,
            duration: 1500,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: streak, alpha: 0, duration: 300,
                    onComplete: () => {
                        streak.destroy();
                        const idx = this.activeElements.findIndex(e => e.obj === streak);
                        if (idx >= 0) this.activeElements.splice(idx, 1);
                    },
                });
            },
        });

        this.activeElements.push({ obj: streak, type: 'meteor' });
    }
```

- [ ] **Step 2: Dodać spawn w updateSpace()**

Na końcu `updateSpace()`:

```ts
        const meteors = this.activeElements.filter(e => e.type === 'meteor').length;
        this.spawnTimers.meteor = (this.spawnTimers.meteor ?? 0) + delta;
        if (meteors < 1 && this.spawnTimers.meteor >= PhaserMath.Between(6000, 10000)) {
            this.spawnTimers.meteor = 0;
            this.spawnMeteor(cameraX, cameraY);
        }
```

Dodać też pomijanie meteorów w cleanupie pozycyjnym (meteor sam się destroyuje przez tween). W pętli cleanupu, razem z `'star'`:

```ts
            if (e.type === 'star' || e.type === 'meteor' || e.type === 'lightning') continue;
```

- [ ] **Step 3: Weryfikacja**

Run: `npx tsc --noEmit` + `npm run dev`. W strefie SPACE co 6-10s przelatuje ukośny meteor z prawej-góry w lewo-dół.

- [ ] **Step 4: Raport**

---

## Task 9: Space — odległa planeta

**Files:**
- Modify: `src/game/systems/ZoneAmbient.ts`

- [ ] **Step 1: spawnPlanet()**

```ts
    private spawnPlanet(cameraX: number, cameraY: number): void {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = cameraX + this.screenW / 2 + side * PhaserMath.Between(200, 350);
        const y = cameraY + PhaserMath.Between(100, this.screenH - 300);

        const colors = [0x8866cc, 0x66aacc, 0xcc6688, 0xaacc66];
        const color = colors[PhaserMath.Between(0, colors.length - 1)];

        const g = this.scene.add.graphics();
        g.fillStyle(color, 1);
        const r = PhaserMath.Between(80, 140);
        g.fillCircle(0, 0, r);
        g.lineStyle(2, 0xffffff, 0.3);
        g.strokeCircle(0, 0, r);
        g.setPosition(x, y);
        g.setScrollFactor(0.15);
        g.setAlpha(0);
        this.container.add(g);

        this.scene.tweens.add({ targets: g, alpha: 0.4, duration: 800 });
        this.activeElements.push({ obj: g, type: 'planet' });
    }
```

- [ ] **Step 2: Dodać w updateSpace() — spawn raz na interwał, max 1 aktywna**

Na końcu `updateSpace()`:

```ts
        const planets = this.activeElements.filter(e => e.type === 'planet').length;
        this.spawnTimers.planet = (this.spawnTimers.planet ?? 0) + delta;
        if (planets < 1 && this.spawnTimers.planet >= 15000) {
            this.spawnTimers.planet = 0;
            this.spawnPlanet(cameraX, cameraY);
        }
```

Dodać `'planet'` do listy pomijanej w cleanupie pozycyjnym (planeta ma bardzo niski scrollFactor, niepotrzebny cleanup):

```ts
            if (e.type === 'star' || e.type === 'meteor' || e.type === 'lightning' || e.type === 'planet') continue;
```

- [ ] **Step 3: Weryfikacja**

Run: `npx tsc --noEmit` + `npm run dev`. W space — raz na ~15s pojawia się duża półprzezroczysta planeta w tle.

- [ ] **Step 4: Raport**

---

## Task 10: Pełny test E2E + polish

**Files:**
- (żadne edycje — faza testowa)

- [ ] **Step 1: Pełny przelot przez 3 strefy**

Run: `npm run dev`. Zbuduj rakietę z dużym fuelem (lub dopal canisterami). Przejdź:
- 0–5000m (ATMOSPHERE): sprawdź chmury + sporadyczny ptak
- 5000–15000m (TURBULENCE): sprawdź że atmosphere-elementy fade-outują, pojawiają się ciemne chmury + błyskawice
- >15000m (SPACE): sprawdź fade-out stormów, pojawienie się gwiazd + meteorów + planety

- [ ] **Step 2: Sprawdzić brak regresji**

- Kolizje z ptakami/asteroidami działają
- Gears/canisters/flames/shields spawnują się i dają się zbierać
- FPS nie spada drastycznie (DevTools → Rendering → FPS meter)
- Crash/restart działa — ZoneAmbient jest destroyowany (brak leak-ów graphics przy restarcie)

- [ ] **Step 3: Raport końcowy**

Opisać co działa, wypisać ewentualne uwagi wizualne/wydajnościowe do poprawy. User decyduje o commicie.

---

## Self-Review Notes

**Spec coverage:**
- Architektura (osobna klasa, container, depth, scrollFactor): Task 1, 2 ✓
- Przejścia z fade: Task 3 ✓
- Atmosphere (chmury + ptak): Task 4, 5 ✓
- Turbulence (stormclouds + lightning): Task 6 ✓
- Space (stars + meteor + planet): Task 7, 8, 9 ✓
- Wydajność (cleanup, bez fizyki, bez assetów): wbudowane w zadania ✓
- Testowanie (npm run dev, brak regresji): Task 10 ✓

**Placeholder scan:** brak TBD/TODO, każdy step ma pełny kod lub komendę.

**Type consistency:** `Zone`, `AmbientElement`, metody `spawnX`, `updateX` — nazewnictwo spójne między zadaniami.

**Preferencja użytkownika (no auto-commit):** wbudowana w każdy "Raport" step zamiast `git commit`.
