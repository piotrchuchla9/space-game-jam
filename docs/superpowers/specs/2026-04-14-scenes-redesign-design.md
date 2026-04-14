# Scenes Redesign — Cartoon Cosmic

**Date:** 2026-04-14
**Scope:** Visual and animation redesign of MenuScene, BuildScene, AchievementsScene, CrashScene. Gameplay logic unchanged. FlightScene and HUDScene out of scope.

## Goals

- Replace the current plain monospace/bracket UI with a polished "cartoon comic" look.
- Keep all existing functionality, state, and sound behavior intact.
- Build a small, reusable UI design system so future scenes stay consistent with minimal effort.
- Moderate animation intensity — screens feel alive without being distracting.

## Direction

- **Visual style:** Cartoon Comic — thick ink outlines, drop shadows, slight tilt/wobble, bouncy entrances.
- **Animation intensity:** Moderate — idle bob/wobble, parallax, confetti on key events, smooth scene transitions. No rainbow noise.
- **Palette (Cosmic):** deep navy → purple → teal background, with warm yellow + pink + cyan accents for focus elements.
- **Backgrounds:** Shared starfield system with scene-specific accents (planet, blueprint hangar, constellations, meteor horizon).
- **Transitions:** Rocket-themed — warp in/out for menu↔screens, rocket liftoff for Build→Flight, flash+shake for Flight→Crash.

## Palette and typography

### Colors

| Token | Hex | Use |
| --- | --- | --- |
| `--bg-deep` | `#0a0e27` | Background top |
| `--bg-mid` | `#1f1547` | Background mid |
| `--bg-near` | `#2a4b6e` | Background bottom / horizon |
| `--accent-warm` | `#ffcc00` | Gears, highscore, stars, yellow buttons |
| `--accent-pink` | `#ff5fa2` | Danger, alerts, crash, pink accents |
| `--accent-cyan` | `#4ad8ff` | Primary buttons, glow, slot empty |
| `--accent-lilac` | `#b79dff` | Secondary text |
| `--ink` | `#0a0a1e` | Outlines (navy-black, not pure black) |
| `--paper` | `#ffffff` | Panels, primary text |

### Fonts

- Display font: `KenneyFuture` (already present at `public/assets/KenneyFuture.ttf`). Registered via `@font-face` in `public/style.css` and pre-loaded with the `CSS Font Loading API` before Phaser boots, to avoid FOUT inside the canvas.
- Fallback: `"Trebuchet MS", sans-serif` for body text.
- Cartoon text treatment: `strokeThickness: 6` on titles, `3` on labels, stroke color `--ink`.

## Design system (`src/game/ui/`)

New directory containing small, single-purpose, reusable modules.

### `StarfieldBackground.ts`

Three parallax layers of stars over a vertical gradient (`--bg-deep` → `--bg-mid` → `--bg-near`).

- Layers: far (slow, small, dim), mid, near (fast, bigger, bright).
- Density defaults: far 80, mid 40, near 20 (scene-overridable).
- Twinkle: random stars tween alpha 0.4↔1.0 every 2-4s.
- Shooting stars: every 8-15s, short cyan or pink streak crosses the top third.
- `addAccent(kind)`: adds a scene-specific decoration layer on top:
  - `'planet'` (MenuScene): large purple→teal gradient planet in bottom-right with yellow rim-light, 0.02 rad/s rotation; small moon orbiting on a 12s circular path.
  - `'blueprint'` (BuildScene): central cyan grid overlay (alpha 0.15), small cartoon gears at the grid's corners spinning slowly.
  - `'constellations'` (AchievementsScene): one glowing constellation per unlocked achievement, thin cyan lines connecting star points, full-group alpha pulse 0.3↔0.5 / 4s.
  - `'meteor'` (CrashScene): pink→orange horizon glow with alpha pulse 0.6↔0.9 / 1.5s; 2-3 meteors streak from top-right every 4-7s.

### `CartoonButton.ts`

Rounded-rectangle button with thick outline and drop shadow, styled to look like a sticker.

- 4px `--ink` border, drop shadow offset (0, 6) in `--ink`, rounded corners.
- Variants: `primary` (cyan fill), `secondary` (yellow fill), `danger` (pink fill), `ghost` (transparent fill, outline only).
- Hover: scale 1.05, shadow offset grows to (0, 10).
- Press: scale 0.95, shadow offset shrinks to (0, 2) — feels like the sticker is being pressed in.
- Idle wobble: `±1.5° / 3s` rotation tween, toggleable per button via a `wobble` option.
- Disabled state: ghost look, alpha 0.6, tooltip chip underneath for reason (used by Launch button).

### `SceneTransition.ts`

- `warpIn(duration = 600)`: stars enter from lines, screen fades from black.
- `warpOut(duration = 500, onComplete)`: stars stretch into lines toward screen center, screen fades to black.
- `flashShake(duration = 400, onComplete)`: white flash + camera shake, used for Flight→Crash entry.
- `rocketLiftoff(rocketSprite, onComplete)`: the provided rocket sprite translates upward off-screen with a thruster trail; background pans down; on complete, `onComplete` fires (used by BuildScene before starting FlightScene).

### `Confetti.ts`

Thin wrapper around a Phaser particle emitter. Single `burst(x, y, options?)` API. Palette-matched colors, gravity + fade. Used at: achievement unlock, part unlock purchase, new highscore.

### `typography.ts`

- `title(scene, x, y, text, size = 64)`: large display text with cartoon stroke and slight rotation.
- `label(scene, x, y, text, size = 20)`: standard label with 3px outline.
- `panel(scene, x, y, w, h, tint = 'paper')`: returns a 9-slice `ui_panel.png` positioned and sized as requested. Used whenever content sits inside a bordered panel.

### `Preloader.ts` (new boot scene)

Owns loading of shared assets: `KenneyFuture` font, audio, images (`rocket`, `gear`, `ui_panel`, `ui_slide_track`, `ui_slide_fill`, etc.). Runs once at app start; scenes stop duplicating `preload()` for shared files. Scene-only assets remain in each scene's `preload()`.

## Scene specs

Canvas size: 720×1280 portrait.

### MenuScene

- Background: `StarfieldBackground` + `addAccent('planet')`.
- Hero rocket: `rocket.png` centered, y≈280, idle bob ±8px / 2.5s, subtle elliptical shadow and cyan thruster particles beneath.
- Title `"ROCKET BUILDER"` at y≈540, 72px display, cyan fill with ink outline, rotation -2°. Entry: scale 0→1 bounce 500ms.
- Highscore chip at y≈640: 240×48 paper panel, yellow text with star icon. If highscore > 0, star pulses ±10% scale / 1.5s.
- Buttons:
  - `[ PLAY ]` primary cyan 280×80 at y=760, wobble on.
  - `[ ACHIEVEMENTS ]` secondary yellow 240×60 at y=870.
- Sound panel (y≈970-1080): same logic as today, but restyled. Sliders use `ui_slide_track.png` / `ui_slide_fill.png`; handle becomes a yellow cartoon circle with ink outline; mute toggle is a ghost `CartoonButton` labeled with speaker/mute shapes (no emoji) to avoid font rendering issues.
- Footer at y=1200: "MACHINES JAM 2026" lilac 16px.
- Entry transition: `warpIn(600)`.
- Exits: PLAY → `warpOut` → `BuildScene`. ACHIEVEMENTS → `warpOut` → `AchievementsScene`.

### BuildScene

- Background: `StarfieldBackground` (30% density) + `addAccent('blueprint')`.
- Header (y 0-140):
  - Budget chip top-left (y=50): panel showing `BUDGET: n/max`. Turns pink with 1.0↔1.08 / 0.5s pulse and light shake when over budget.
  - Gears chip top-right: panel with spinning `gear.png` icon and yellow count; count scales 1→1.2→1 over 400ms on change.
  - Title `"BUILD YOUR ROCKET"` at y=120 center, 40px display, pink fill, ink outline, -1° rotation.
- Slot area (y 200-720) sits on the blueprint:
  - Each slot is a rounded rect with 4px ink outline and `--paper` alpha 0.1 fill; cyan when empty, green when equipped, pink pulse when over budget.
  - Hover reuses `CartoonButton`-style scale + shadow feedback.
  - Empty state shows a large cyan "+" icon with a label below; equipped state shows the part name (18px) and a small colored dot keyed to slot type.
  - Idle wobble ±1° every 4s, desynchronized per slot.
- Rocket preview wiring: connect slots visually with 3px `--ink` lines (nose→body→engine vertical axis, body→left/right "arms"), so the slot layout reads as a rocket silhouette.
- Launch button (y=820): primary yellow `CartoonButton` 340×96 with flame icon (built from simple shapes, no emoji). Disabled → ghost variant + tooltip chip beneath (`NEEDS ENGINE` or `OVER BUDGET`, pink). Enabled → idle wobble + tiny thruster particle every 3s on the lower edge.
- Part panel (opened on slot tap):
  - Slides up from bottom with `Back.easeOut` 300ms.
  - Background uses `ui_panel.png` 9-slice.
  - Each row is a cartoon card with rounded corners, outline, and shadow; hover translates y by -4.
  - Equipped rows have a green "EQUIPPED" sticker in the corner.
  - Locked rows are grey with a cartoon lock and an `UNLOCK: Ng` secondary-yellow button. Successful purchase triggers a `Confetti.burst` at the button.
- Back button at y=1230: ghost `CartoonButton` "< MENU", no wobble.
- Exit to Flight: `SceneTransition.rocketLiftoff(rocketSprite)` → `scene.start('FlightScene')`.

### AchievementsScene

- Background: `StarfieldBackground` + `addAccent('constellations')`. One constellation per unlocked achievement; locked achievements contribute no constellation.
- Header (y 0-160):
  - Title `"ACHIEVEMENTS"` at y=90, 56px display, yellow fill + ink outline, entry: scale 0→1 bounce.
  - Progress chip at y=150: panel `n / total UNLOCKED`, lilac label with yellow number. On scene entry, the number tweens from 0 to its value over 600ms.
- List (y 200-1050):
  - Scrollable container (infrastructure in place even if current 7 items fit without scroll).
  - Each entry is a 600×96 cartoon card with 4px ink outline and drop shadow.
    - Unlocked: paper tint with cyan/yellow gradient, yellow cartoon ★ (48px, x=80, slow rotation 0.3 rad/s), bold paper-colored name (22px), lilac description (14px).
    - Locked: dark navy tint at alpha 0.4, lock shape instead of star, grey text, progress description (e.g. `5200 / 10000 altitude`) with a thin cyan progress bar beneath.
  - Entry: cards stagger in from the right (80ms each, `Back.easeOut` 400ms).
- Hover: scale 1.02, shadow grows, ±1° tilt. Cards are not actionable; visual feedback only.
- Back button at y=1180: ghost `CartoonButton` "< BACK".
- Exit to Menu: `warpOut` → `MenuScene`.
- Out of scope: adding unlock timestamps to `GameState`. Not displayed.

### CrashScene

- Background: `StarfieldBackground` (sparser, cooler) + `addAccent('meteor')`.
- Entry transition: `flashShake(400)` → content fades in.
- Layout:
  - `"CRASH!"` at y=220, 84px display, pink fill + ink outline. Entry: scale 0→1.3→1 bounce + 200ms shake. Below it, a rotated (-40°) `rocket.png` with ~8 cartoon smoke/star particles drifting upward.
  - Stats panel at y=420-750 — one large 9-slice panel styled as a mission report:
    - `MAX ALTITUDE: n` — white, value counter-tweens from 0 over 800ms.
    - `GEARS COLLECTED: n` — yellow, with a spinning gear icon, counter tween.
    - Dashed 2px `--ink` separator.
    - `SCORE: n` — 40px cyan bold, counter tween over 1200ms for emphasis.
    - If `isNewHighscore`: with a 1300ms delay, a yellow "★ NEW HIGHSCORE ★" chip fades in with sparkle particles and a single `Confetti.burst`.
    - `HIGHSCORE: n` and `WALLET: ng` as smaller lilac lines in the panel footer.
  - Buttons:
    - `[ REBUILD ]` primary cyan 320×88 at y=870, wobble on, flame icon shape (no emoji).
    - `[ MENU ]` ghost lilac 200×60 at y=990.
- Achievement toasts: reuse existing logic, but reskin — background is a yellow-bordered 9-slice panel, a spinning ★ on the left, text `ACHIEVEMENT UNLOCKED: <name>`, `Confetti.burst` on slide-in. Slide up from the bottom with `Back.easeOut`, hold 3.5s, fade out.
- Exits: REBUILD → `warpOut` → `BuildScene`. MENU → `warpOut` → `MenuScene`.

## Implementation order

1. **Preloader scene + font loading** — foundation so scenes can rely on `KenneyFuture` and shared assets being ready.
2. **Design system modules** — `StarfieldBackground`, `CartoonButton`, `SceneTransition`, `Confetti`, `typography`. Each with enough structure to drop into a scene.
3. **MenuScene** — smallest and most visible surface; validates the system end-to-end.
4. **AchievementsScene** — simple layout, exercises list/card patterns.
5. **BuildScene** — most complex layout; leans on patterns proven by Menu and Achievements.
6. **CrashScene** — integrates the transition system (`flashShake`) and confetti on highscore.

Each step is independently verifiable in the browser.

## Out of scope

- FlightScene and HUDScene visuals (unchanged).
- Gameplay balance, parts, achievements logic.
- Adding unlock timestamps to `GameState`.
- New audio assets (reuse existing clicks, builds, buys, errors).
- Localization.

## Risks and mitigations

- **Font loading FOUT in canvas.** Mitigate with explicit `document.fonts.load()` in `Preloader` before any scene starts.
- **Emoji rendering inconsistency across browsers.** Avoid emoji in canvas text; use shape-based icons built from Phaser graphics (flame, lock, speaker).
- **Scrollable achievements list not needed today.** Build the infrastructure but don't over-engineer; hide scrollbar when content fits.
- **Animation overuse causing CPU spikes on low-end devices.** Cap simultaneous tweens; desync idle wobbles; tie shooting-star spawns to scene-specific throttles.
