# Zone Ambient Background — Design

**Date:** 2026-04-15
**Status:** Approved

## Problem

Menu ma fajne animowane tło (spadające gwiazdy, planeta). Podczas lotu w `FlightScene` tło tylko zmienia kolor — jest nudne. Chcemy dodać dekoracyjne animacje ambientowe, różne dla każdej strefy lotu.

## Scope

- Dekoracyjne elementy tła, bez kolizji, za rakietą (depth < rocket), z parallaxem
- Osobny zestaw elementów per-zone
- Oszczędnie: max 1–2 typy aktywne równocześnie
- Płynne przejścia (fade-in/out) między strefami

Nie w zakresie: nowe assety graficzne, elementy interaktywne, wpływ na gameplay.

## Zones (od FlightScene)

- **ATMOSPHERE** — `altitude < 5000`
- **TURBULENCE** — `5000 ≤ altitude < 15000`
- **SPACE** — `altitude ≥ 15000`

## Architektura

Nowy plik: `src/game/systems/ZoneAmbient.ts`.

```ts
class ZoneAmbient {
  constructor(scene: FlightScene)
  update(delta: number, altitude: number, cameraX: number, cameraY: number): void
  destroy(): void
}
```

Wewnętrzna struktura:
- `currentZone: 'atmosphere' | 'turbulence' | 'space'`
- `activeElements: AmbientElement[]` — aktywne
- `fadingOutElements: AmbientElement[]` — zanikające przy zmianie strefy
- `spawnTimers: Record<string, number>` — cooldown per typ
- `container: GameObjects.Container` — depth `-10` (za rakietą)

Integracja w `FlightScene`:
- Tworzymy instancję w `create()` po `zoneManager`
- W `update()`: `zoneAmbient.update(delta, altitude, cam.scrollX, cam.scrollY)`
- W cleanup (shutdown / crash): `zoneAmbient.destroy()`

Separacja od `ZoneManager`: `ZoneManager` zajmuje się gameplayowymi spawnami (ptaki, asteroidy, gears, canisters, flames, shields) + kolizjami; `ZoneAmbient` tylko tłem bez fizyki.

## Efekty per-zone

### ATMOSPHERE (0–5000)
- **Chmury** — owalne jasne kształty (Graphics, biały/jasnoszary, alpha ~0.5), dryfują poziomo 15–30 px/s, parallax 0.4–0.7. Max 4 naraz. Spawn co 2500–4000 ms.
- **Ptak w oddali** (rzadki) — mały kształt "V" (Graphics), raz na 8–12 s, leci w poprzek, parallax 0.5.

### TURBULENCE (5000–15000)
- **Ciemne chmury burzowe** — większe, ciemnoszare (alpha ~0.7), wolniejszy dryf, parallax 0.5. Max 3 naraz. Spawn co 3000–5000 ms.
- **Błyskawice w oddali** — zygzak (Graphics `lineStyle`, biały), flash 100 ms + fade 300 ms. Co 4000–7000 ms. Bez dźwięku.

### SPACE (>15000)
- **Odległe gwiazdy parallax** — ~50 drobnych kropek, scrollFactor 0.1, rozrzucone w dużym obszarze. Statyczne + lekki twinkle.
- **Kometa/meteor** — ukośny streak z ogonem, parallax 0.3. Co 6000–10000 ms. Max 1 naraz.
- **Odległa planeta** — duża półprzezroczysta kula (alpha ~0.4), parallax 0.15. Max 1 naraz, re-spawn raz na strefę po znikaniu.

Wszystkie elementy: fade-in `alpha 0 → target` przez 600 ms po spawnie.

## Przejścia między strefami

W `update()` liczymy `newZone` z `altitude` (te same progi co w FlightScene).

Gdy `newZone !== currentZone`:
1. Przenosimy wszystkie `activeElements` do `fadingOutElements`
2. Każdemu odpalamy tween `alpha → 0` przez 1000 ms, onComplete: `destroy()` + usuń z listy
3. Resetujemy spawn timery — nowe elementy spawnują się od razu (z własnym fade-in 600 ms)
4. `currentZone = newZone`

## Spawn i cleanup

- Per-typ timer + losowy interwał w podanym zakresie
- Limit aktywnych per typ (patrz wyżej)
- Spawn X: `cameraX ± (screenWidth/2 + buffer)` — wchodzą z krawędzi
- Spawn Y: zależne od typu (chmury rozrzucone w obszarze kamery, gwiazdy w dużym buforze)
- Cleanup: element wychodzi poza `cameraX ± 1500` lub `cameraY ± 1500` → `destroy()`

## Element structure

```ts
interface AmbientElement {
  obj: Phaser.GameObjects.GameObject;
  type: string;              // 'cloud' | 'bird' | 'stormcloud' | 'lightning' | 'star' | 'meteor' | 'planet'
  driftX?: number;           // prędkość dryfu px/s
  fadeInTween?: Phaser.Tweens.Tween;
}
```

## Wydajność

- Tylko `Graphics`/`Rectangle`/`Arc`/`Circle` — bez nowych assetów w Preloaderze
- Bez fizyki Matter, bez kolizji
- Container z `scrollFactor(1)`; elementy nadpisują swój scrollFactor dla parallaxu
- Aggressive cleanup poza obszarem kamery

## Testowanie

- `npm run dev`, przelecieć przez wszystkie 3 strefy
- Sprawdzić: (a) każda strefa ma właściwe efekty, (b) przejścia są płynne (fade), (c) elementy znikają poza ekranem, (d) brak regresji w ZoneManager (ptaki, asteroidy, gears itd. spawnują się normalnie), (e) brak spadku FPS

## Pliki do zmian

- **Nowy:** `src/game/systems/ZoneAmbient.ts`
- **Edytowany:** `src/game/scenes/FlightScene.ts` — instancja + wywołanie update + cleanup
