# Rocket Builder

Build a modular rocket under constraints and launch it to reach the highest possible altitude.

> Built for the [Gamedev.js Jam 2026](https://gamedevjs.com/jam/2026/) by [Piotr Chuchla](https://github.com/piotrchuchla9) and [Miłosz Zajonc](https://github.com/ZajoncM).

## Overview

Rocket Builder is a mobile-first game where you assemble a rocket from modular parts — nose, body, engine, wings, fuel — under a currency budget, then launch it into a vertical obstacle course. Avoid meteors, storm clouds, and black holes; collect gears and fuel canisters; grab boosts; push for a new altitude record. Gears you collect unlock better parts for your next run.

Canvas runs at 720 × 1280 with Matter.js physics.

## Gameplay loop

1. **Build** — pick parts under a budget
2. **Launch** — start the flight
3. **Fly** — manage thrust and control
4. **Collect & avoid** — gears, canisters, boosts / meteors, storms, black holes
5. **Crash** — run ends
6. **Earn** — currency based on altitude and pickups
7. **Upgrade** — unlock new parts
8. **Repeat** — push the highscore

## Features

- Modular rocket builder with 5 slot types (nose / body / engine / wings / fuel) and per-part stats (thrust, drag, control, fuel burn, shield, rotation damping, bonus fuel)
- Matter.js physics flight with thrust, gravity, rotation, and torque
- Obstacle variety: meteors, storm clouds, black holes — spawned by an altitude-zone system
- Collectibles: gears (currency), fuel canisters, boost pickups; one-hit shield absorbs damage
- Achievements with Wavedash-backed persistence and reward claiming
- Four Wavedash leaderboards: altitude, max speed, gears, time-to-moon
- Starfield parallax + per-zone ambient backgrounds (planets, clouds, plants)
- Minimap showing nearby obstacles and pickups during flight
- Full save/load via localStorage: currency, highscore, unlocked parts, claimed achievements, audio prefs

## Tech stack

- [Phaser 4.0.0](https://phaser.io)
- [TypeScript ~5.7](https://www.typescriptlang.org)
- [Vite ^6.3](https://vitejs.dev)
- Matter.js physics (bundled in Phaser)
- [Wavedash JS SDK](https://wavedash.com) for achievements and leaderboards (see `wavedash.toml`)

## Requirements

[Node.js](https://nodejs.org) is required to install dependencies and run scripts via `npm`.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:8080` with hot reload.

## Available scripts

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Launch the development server on port 8080 |
| `npm run build` | Produce a production build in `dist/` |

## Project structure

| Path | Description |
|---|---|
| `index.html` | Entry HTML page |
| `src/main.ts` | App bootstrap — calls `StartGame('game-container')` |
| `src/game/main.ts` | Phaser game config + scene registration |
| `src/game/GameState.ts` | Global singleton: currency, unlocked parts, save/load, leaderboard submission |
| `src/game/parts.ts` | Part definitions (stats, weights, unlock costs, texture keys) |
| `src/game/scenes/` | 9 Phaser scenes: `Preloader`, `MenuScene`, `BuildScene`, `FlightScene`, `HUDScene`, `CrashScene`, `AchievementsScene`, `InstructionScene`, `AuthorsScene` |
| `src/game/objects/` | `Rocket`, `Gear`, `Canister`, `Flame`, `Shield`, `Obstacle`, `MeteorObstacle`, `StormObstacle` |
| `src/game/systems/` | `AchievementManager`, `InputManager`, `ZoneManager`, `ZoneAmbient` |
| `src/game/ui/` | `CartoonButton`, `StarfieldBackground`, `SceneTransition`, `Confetti`, `Minimap`, `colors`, `typography` |
| `public/assets/` | Runtime-loaded images, audio, fonts |
| `vite/config.dev.mjs` / `vite/config.prod.mjs` | Vite dev and production configs |
| `wavedash.toml` | Wavedash deploy config (game id, upload dir) |
| `concept.md` | Original design brief |
| `docs/superpowers/plans/` · `docs/superpowers/specs/` | Design history for major features (rocket builder, achievements, scenes redesign, zone ambient background, minimap) |

## Controls

Tap to thrust; simple, arcade-style input. Keyboard handling lives in `src/game/systems/InputManager.ts` — see the source for exact key bindings.

## Deployment

`npm run build` emits the production bundle into `dist/`. The project ships to [Wavedash](https://wavedash.com) using `wavedash.toml`, which points `upload_dir` at `./dist`.

## Credits

### Authors

- [Piotr Chuchla](https://github.com/piotrchuchla9) — [@piotrchuchla9](https://github.com/piotrchuchla9)
- [Miłosz Zajonc](https://github.com/ZajoncM) — [@ZajoncM](https://github.com/ZajoncM)

Made for the [Gamedev.js Jam 2026](https://gamedevjs.com/jam/2026/).

### Assets

- UI, rocket parts, space shooter, and platformer art packs by [Kenney](https://kenney.nl) (CC0)
- `KenneyFuture` font by [Kenney](https://kenney.nl)

## License

MIT — see [LICENSE](./LICENSE).
