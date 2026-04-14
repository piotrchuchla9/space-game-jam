# Rocket Builder — Design Spec

## Overview

Gra na game jam (temat: MACHINES, 13 dni). Gracz buduje modularną rakietę z części o różnych statystykach, odpala ją i steruje lotem, zbierając gears i unikając przeszkód. Cel: najwyższy pułap. Phaser 4 + Matter.js, pixel art, przeglądarka (desktop + mobile).

## Tech Stack

- **Phaser 4.0.0** + Vite + TypeScript
- **Matter.js** (wbudowany w Phaser) — fizyka 2D
- **Pixel art** — styl graficzny
- **localStorage** — persystencja (highscore, unlocks, waluta)

## Architektura scen

```
MenuScene → BuildScene → FlightScene (+ HUDScene overlay) → CrashScene → BuildScene
                                                                ↓
                                                          MenuScene (quit)
```

| Scena | Odpowiedzialność |
|-------|-----------------|
| MenuScene | Ekran startowy, przycisk Play, wyświetlanie highscore |
| BuildScene | 5 slotów rakiety, lista części per slot, budżet, przycisk Launch |
| FlightScene | Fizyka Matter.js, sterowanie rakietą, spawn przeszkód i collectibles, strefy |
| HUDScene | Parallel scene nad FlightScene — altitude, fuel bar, score, gears |
| CrashScene | Podsumowanie runu: max altitude, gears zebrane, highscore update, Rebuild/Menu |

### GameState (singleton)

```ts
interface GameState {
  currency: number;           // gears w portfelu (localStorage)
  highscore: number;          // najwyższy score (localStorage)
  unlockedParts: string[];    // ID odblokowanych części (localStorage)
  rocketConfig: {             // aktualny build
    nose: string;
    body: string;
    engine: string;
    leftModule: string | null;
    rightModule: string | null;
  };
  lastRun: {                  // wynik ostatniego runu
    altitude: number;
    gears: number;
    score: number;
  };
}
```

Dane przechodzą między scenami przez GameState. Sceny nie wiedzą o sobie nawzajem.

## System części i slotów

### 5 slotów rakiety

| Slot | Typ | Wpływ na fizykę |
|------|-----|-----------------|
| Nose | NosePart | drag, waga |
| Body | BodyPart | HP, waga |
| Engine | EnginePart | thrust, control, fuelBurn |
| Left Module | ModulePart | stabilizacja / utility |
| Right Module | ModulePart | stabilizacja / utility |

Nose, Body, Engine — wymagane. Left/Right Module — opcjonalne (mogą być puste).

### 9 części MVP

| Część | Slot | Statystyki | Unlock cost |
|-------|------|-----------|-------------|
| Standard Cone | Nose | drag: 1.0, weight: 1 | start |
| Heavy Nose | Nose | drag: 0.6, weight: 3 | 30 gears |
| Light Frame | Body | HP: 1, weight: 2 | start |
| Armored Frame | Body | HP: 3, weight: 5 | 60 gears |
| Basic Engine | Engine | thrust: 5, control: 0.8, fuelBurn: 1.0 | start |
| Boost Engine | Engine | thrust: 9, control: 0.3, fuelBurn: 2.0 | 50 gears |
| Fins | Module | rotationDamping: 0.7, weight: 1 | start |
| Fuel Tank | Module | bonusFuel: 50, weight: 2 | 40 gears |
| Shield | Module | shieldHP: 1, weight: 2 | 50 gears |

### Budżet

Każda część ma koszt budżetowy (osobny od unlock cost). Gracz ma limit budżetu per run (np. 100). Musi zmieścić build w budżecie.

Budżet per część:

| Część | Budżet |
|-------|--------|
| Standard Cone | 10 |
| Heavy Nose | 25 |
| Light Frame | 15 |
| Armored Frame | 35 |
| Basic Engine | 20 |
| Boost Engine | 40 |
| Fins | 10 |
| Fuel Tank | 20 |
| Shield | 25 |

### Asymetria modułów

Jeśli lewy i prawy moduł mają różną wagę, rakieta ma offset center of mass → naturalny moment obrotowy w Matter.js. Dwa Fins = stabilna. Fin + Fuel Tank = lekko niestabilna. To daje emergent chaos from builds.

### Interakcja budowania

Klik na slot → otwiera się lista dostępnych (odblokowanych) części dla tego slotu. Klik na część → zamontowana. Klik na zamontowaną część → demontaż. Prosty, działa na mobile i desktop.

## Fizyka lotu (Matter.js)

### Rakieta jako compound body

Złożona z 5 elementów Matter.js (nos, body, engine, moduły) połączonych constraintami. Center of mass wyliczany z wag części.

### Siły

- **Thrust** — siła aplikowana na pozycję engine'a, w kierunku "przodu" rakiety (góra). Wartość z engine.thrust.
- **Gravity** — stała siła w dół (np. 0.001). Nie zmienia się ze strefami.
- **Drag** — siła przeciwna do kierunku ruchu, skalowana przez nose.drag. Wyższy drag = wolniejsze ale stabilniejsze. W kosmosie (altitude 3000+) drag spada do 0.1x.
- **Rotacja** — naturalna z Matter.js (torque od off-center thrust i asymetrii wagi). Fins dodają angularDamping do body.

### Paliwo

- Startowe: 100 + suma bonusFuel z modułów
- Zużycie: engine.fuelBurn per sekundę aktywnego thrustu
- Paliwo = 0 → brak thrustu, rakieta spada pod wpływem grawitacji

### Sterowanie

**Desktop:**
- Space / W — thrust
- A / D — boczny thrust (siła skalowana przez engine.control)
- Hold = ciągły thrust

**Mobile:**
- Tap środek ekranu — thrust
- Tap lewa strona — boczny thrust w lewo
- Tap prawa strona — boczny thrust w prawo
- Hold = ciągły thrust

## Strefy i przeszkody

### 3 strefy pionowe

| Strefa | Altitude | Charakterystyka | Przeszkody |
|--------|----------|----------------|------------|
| Atmosfera | 0–1000 | Normalny drag, spokojnie | Ptaki — wolne, proste trajektorie |
| Turbulencje | 1000–3000 | Losowe boczne siły co 2-4s | Chmury — push w losowym kierunku przy kontakcie |
| Kosmos | 3000+ | Drag * 0.1, wysoka inercja | Asteroidy — szybkie, losowe kierunki |

### Spawn przeszkód

- Pojawiają się poza ekranem (boki + góra)
- Gęstość rośnie z altitude (np. co 500 altitude +10% spawn rate)
- Kolizja z przeszkodą = -1 HP. HP = 0 → crash.
- Shield absorbuje 1 hit zamiast HP.

### Collectibles

- **Gears** — losowo rozrzucone w świecie, częstsze w strefie turbulencji. Magnet (jeśli zamontowany) przyciąga z większego zasięgu (np. 150px zamiast 30px).
- Zbieranie: kolizja z rakietą → gear znika z tweenem + dźwięk.

## Scoring i progresja

### Score

```
score = maxAltitude + (gearsCollected * 10)
```

Highscore = najwyższy score ever, zapisany w localStorage.

### Waluta

- Gears zebrane podczas runu → dodawane do portfela po crash
- Budżet budowania to osobny limit per run (nie wydaje gears)
- Gears wydawane na odblokowanie nowych części (jednorazowy unlock)

### Progresja MVP

- **Start:** Basic Engine, Standard Cone, Light Frame, Fins — odblokowane
- **Unlock za gears:** Boost Engine (50g), Heavy Nose (30g), Armored Frame (60g), Fuel Tank (40g), Shield (50g)
- Po odblokowaniu część jest dostępna na stałe

## UI

### BuildScene

- Rakieta na środku ekranu z 5 klikalnymi slotami (podświetlone obramowanie)
- Po kliknięciu slotu — panel boczny z listą części (nazwa, statystyki, koszt budżetowy)
- Zablokowane części widoczne ale wyszarzone z ceną unlock
- Budżet: pasek / licznik na górze ekranu
- Portfel gears: prawy górny róg
- Przycisk LAUNCH na dole (aktywny gdy engine zamontowany)

### HUD (FlightScene)

- Altitude (licznik) — lewy górny róg
- Fuel bar — prawy górny róg
- Gears zebrane w tym runie — pod fuel bar
- Aktualna strefa — tekst pod altitude

### CrashScene

- Max altitude osiągnięty
- Gears zebrane
- Nowy score
- Highscore (z wyróżnieniem jeśli pobity)
- Przycisk REBUILD → BuildScene
- Przycisk MENU → MenuScene

## Juice

### Must-have

- Cząsteczki ognia z engine'a (proporcjonalnie do thrust)
- Eksplozja pixel-artowa przy crash
- Screen shake przy boost i crash
- Tween na zbieranie gears (powiększenie + zanikanie)
- Dźwięki: thrust (loop), impact, gear collect, crash, UI click

### Nice-to-have (post-MVP)

- Trail za rakietą
- Slow motion na crash (0.5s)
- Zmiana tła z altitude (niebieskie niebo → ciemniejsze → gwiazdy)
- Parallax scrolling tła

## Kamera

- FlightScene: kamera podąża za rakietą (vertical scrolling)
- Rakieta utrzymywana w dolnej 1/3 ekranu
- Przeszkody i collectibles spawnowane powyżej widoku kamery
- Tło scrolluje się z parallaxem (wolniej niż foreground)

## Tuning

Wartości liczbowe w tym specu (thrust, drag, gravity, budżety, spawn rates) to wartości startowe. Wymagają iteracyjnego tuningu przez playtesting. Priorytet: gra musi być "fun", nie "balanced".

## Rozdzielczość i responsywność

- Base resolution: 720x1280 (portrait, mobile-first aspect ratio)
- Scale mode: FIT z CENTER_BOTH
- Touch input: podział ekranu na 3 strefy (lewa, środek, prawa)
- Desktop: ta sama proporcja, klawiatura jako alternatywa
