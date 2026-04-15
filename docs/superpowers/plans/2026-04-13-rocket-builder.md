# Rocket Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular rocket-building + flight game for the MACHINES game jam in Phaser 4 with Matter.js physics.

**Architecture:** Scene-based architecture with 5 scenes (Menu, Build, Flight, HUD, Crash). GameState singleton handles data flow between scenes. Parts defined as data config. Matter.js compound body for rocket physics.

**Tech Stack:** Phaser 4.0.0, Matter.js (built-in), TypeScript, Vite, localStorage for persistence.

**Note:** Phaser 4 is new — verify API calls against `node_modules/phaser/types` if something doesn't compile. Values (thrust, drag, gravity) are starting points for tuning.

---

## File Structure

```
src/
  main.ts                          # Entry point (exists, no changes)
  game/
    main.ts                        # Phaser config (exists, modify for Matter.js + portrait)
    GameState.ts                   # Singleton: currency, highscore, rocketConfig, unlocks
    parts.ts                       # Parts data config (all 9 parts, stats, costs)
    scenes/
      MenuScene.ts                 # Start screen, highscore display
      BuildScene.ts                # Rocket building UI (slots, part list, budget)
      FlightScene.ts               # Flight gameplay (physics, obstacles, collectibles)
      HUDScene.ts                  # Overlay: altitude, fuel, gears
      CrashScene.ts                # Run summary, score, rebuild/menu buttons
    objects/
      Rocket.ts                    # Matter.js compound body builder + fuel/HP state
      Obstacle.ts                  # Obstacle factory (bird, cloud, asteroid)
      Gear.ts                      # Collectible gear object
    systems/
      InputManager.ts              # Unified keyboard + touch input
      ZoneManager.ts               # Zone transitions, obstacle/gear spawning
public/
  assets/
    (pixel art sprites — created during implementation)
```

---

### Task 1: Project Setup

**Files:**

- Modify: `src/game/main.ts`
- Modify: `index.html`
- Delete: `src/game/scenes/Game.ts` (replace with new scenes)

- [ ] **Step 1: Update Phaser config for Matter.js + portrait resolution**

In `src/game/main.ts`, replace the entire content:

```ts
import { AUTO, Game, Scale, Types } from "phaser";
import { MenuScene } from "./scenes/MenuScene";
import { BuildScene } from "./scenes/BuildScene";
import { FlightScene } from "./scenes/FlightScene";
import { HUDScene } from "./scenes/HUDScene";
import { CrashScene } from "./scenes/CrashScene";

const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 720,
  height: 1280,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 1 },
      debug: true, // disable before release
    },
  },
  scene: [MenuScene, BuildScene, FlightScene, HUDScene, CrashScene],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
```

- [ ] **Step 2: Update HTML title**

In `index.html`, change `<title>Phaser - Template</title>` to `<title>Rocket Builder</title>`.

- [ ] **Step 3: Create placeholder scene files**

Create each scene as a minimal stub so the project compiles:

`src/game/scenes/MenuScene.ts`:

```ts
import { Scene } from "phaser";

export class MenuScene extends Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.add
      .text(360, 640, "ROCKET BUILDER", {
        fontSize: "48px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
```

`src/game/scenes/BuildScene.ts`:

```ts
import { Scene } from "phaser";

export class BuildScene extends Scene {
  constructor() {
    super("BuildScene");
  }

  create() {
    this.add
      .text(360, 640, "BUILD SCENE", {
        fontSize: "32px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
```

`src/game/scenes/FlightScene.ts`:

```ts
import { Scene } from "phaser";

export class FlightScene extends Scene {
  constructor() {
    super("FlightScene");
  }

  create() {
    this.add
      .text(360, 640, "FLIGHT SCENE", {
        fontSize: "32px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
```

`src/game/scenes/HUDScene.ts`:

```ts
import { Scene } from "phaser";

export class HUDScene extends Scene {
  constructor() {
    super("HUDScene");
  }

  create() {}
}
```

`src/game/scenes/CrashScene.ts`:

```ts
import { Scene } from "phaser";

export class CrashScene extends Scene {
  constructor() {
    super("CrashScene");
  }

  create() {
    this.add
      .text(360, 640, "CRASH SCENE", {
        fontSize: "32px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
```

- [ ] **Step 4: Delete old Game.ts**

Delete `src/game/scenes/Game.ts` — it's the template default and no longer needed.

- [ ] **Step 5: Verify project compiles and runs**

Run: `npm run dev`
Expected: Browser opens, shows "ROCKET BUILDER" text centered on a dark portrait canvas (720x1280). No errors in console.

- [ ] **Step 6: Commit**

```bash
git add src/game/main.ts src/game/scenes/ index.html
git rm src/game/scenes/Game.ts
git commit -m "feat: project setup with Matter.js, portrait resolution, scene stubs"
```

---

### Task 2: Parts Data Config

**Files:**

- Create: `src/game/parts.ts`

- [ ] **Step 1: Define part types and data**

Create `src/game/parts.ts`:

```ts
export type SlotType = "nose" | "body" | "engine" | "module";

export interface PartDef {
  id: string;
  name: string;
  slot: SlotType;
  weight: number;
  budgetCost: number;
  unlockCost: number | null; // null = available from start
  // Slot-specific stats
  drag?: number; // nose
  hp?: number; // body
  thrust?: number; // engine
  control?: number; // engine
  fuelBurn?: number; // engine
  rotationDamping?: number; // module
  bonusFuel?: number; // module
  shieldHP?: number; // module
}

export const PARTS: Record<string, PartDef> = {
  standardCone: {
    id: "standardCone",
    name: "Standard Cone",
    slot: "nose",
    weight: 1,
    budgetCost: 10,
    unlockCost: null,
    drag: 1.0,
  },
  heavyNose: {
    id: "heavyNose",
    name: "Heavy Nose",
    slot: "nose",
    weight: 3,
    budgetCost: 25,
    unlockCost: 30,
    drag: 0.6,
  },
  lightFrame: {
    id: "lightFrame",
    name: "Light Frame",
    slot: "body",
    weight: 2,
    budgetCost: 15,
    unlockCost: null,
    hp: 1,
  },
  armoredFrame: {
    id: "armoredFrame",
    name: "Armored Frame",
    slot: "body",
    weight: 5,
    budgetCost: 35,
    unlockCost: 60,
    hp: 3,
  },
  basicEngine: {
    id: "basicEngine",
    name: "Basic Engine",
    slot: "engine",
    weight: 2,
    budgetCost: 20,
    unlockCost: null,
    thrust: 5,
    control: 0.8,
    fuelBurn: 1.0,
  },
  boostEngine: {
    id: "boostEngine",
    name: "Boost Engine",
    slot: "engine",
    weight: 3,
    budgetCost: 40,
    unlockCost: 50,
    thrust: 9,
    control: 0.3,
    fuelBurn: 2.0,
  },
  fins: {
    id: "fins",
    name: "Fins",
    slot: "module",
    weight: 1,
    budgetCost: 10,
    unlockCost: null,
    rotationDamping: 0.7,
  },
  fuelTank: {
    id: "fuelTank",
    name: "Fuel Tank",
    slot: "module",
    weight: 2,
    budgetCost: 20,
    unlockCost: 40,
    bonusFuel: 50,
  },
  shield: {
    id: "shield",
    name: "Shield",
    slot: "module",
    weight: 2,
    budgetCost: 25,
    unlockCost: 50,
    shieldHP: 1,
  },
};

export function getPartsForSlot(slot: SlotType): PartDef[] {
  return Object.values(PARTS).filter((p) => p.slot === slot);
}

export const BUILD_BUDGET = 100;
export const BASE_FUEL = 100;
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run dev`
Expected: No TypeScript errors. Game still shows MenuScene text.

- [ ] **Step 3: Commit**

```bash
git add src/game/parts.ts
git commit -m "feat: add parts data config with 9 MVP parts"
```

---

### Task 3: GameState Singleton

**Files:**

- Create: `src/game/GameState.ts`

- [ ] **Step 1: Implement GameState with localStorage persistence**

Create `src/game/GameState.ts`:

```ts
import { PARTS } from "./parts";

const STORAGE_KEY = "rocketbuilder_save";

export interface RocketConfig {
  nose: string;
  body: string;
  engine: string;
  leftModule: string | null;
  rightModule: string | null;
}

export interface LastRun {
  altitude: number;
  gears: number;
  score: number;
}

interface SaveData {
  currency: number;
  highscore: number;
  unlockedParts: string[];
}

class GameStateClass {
  currency: number = 0;
  highscore: number = 0;
  unlockedParts: string[] = [];

  rocketConfig: RocketConfig = {
    nose: "standardCone",
    body: "lightFrame",
    engine: "basicEngine",
    leftModule: null,
    rightModule: null,
  };

  lastRun: LastRun = {
    altitude: 0,
    gears: 0,
    score: 0,
  };

  constructor() {
    this.load();
    this.initDefaultUnlocks();
  }

  private initDefaultUnlocks() {
    const defaults = Object.values(PARTS)
      .filter((p) => p.unlockCost === null)
      .map((p) => p.id);
    for (const id of defaults) {
      if (!this.unlockedParts.includes(id)) {
        this.unlockedParts.push(id);
      }
    }
  }

  isUnlocked(partId: string): boolean {
    return this.unlockedParts.includes(partId);
  }

  unlockPart(partId: string): boolean {
    const part = PARTS[partId];
    if (!part || !part.unlockCost) return false;
    if (this.isUnlocked(partId)) return false;
    if (this.currency < part.unlockCost) return false;

    this.currency -= part.unlockCost;
    this.unlockedParts.push(partId);
    this.save();
    return true;
  }

  getBudgetUsed(): number {
    let total = 0;
    const slots = [
      "nose",
      "body",
      "engine",
      "leftModule",
      "rightModule",
    ] as const;
    for (const slot of slots) {
      const partId = this.rocketConfig[slot];
      if (partId && PARTS[partId]) {
        total += PARTS[partId].budgetCost;
      }
    }
    return total;
  }

  finishRun(altitude: number, gears: number) {
    const score = Math.floor(altitude) + gears * 10;
    this.lastRun = { altitude: Math.floor(altitude), gears, score };
    this.currency += gears;
    if (score > this.highscore) {
      this.highscore = score;
    }
    this.save();
  }

  save() {
    const data: SaveData = {
      currency: this.currency,
      highscore: this.highscore,
      unlockedParts: this.unlockedParts,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data: SaveData = JSON.parse(raw);
      this.currency = data.currency ?? 0;
      this.highscore = data.highscore ?? 0;
      this.unlockedParts = data.unlockedParts ?? [];
    } catch {
      // corrupted save, start fresh
    }
  }

  resetSave() {
    localStorage.removeItem(STORAGE_KEY);
    this.currency = 0;
    this.highscore = 0;
    this.unlockedParts = [];
    this.initDefaultUnlocks();
  }
}

export const GameState = new GameStateClass();
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run dev`
Expected: No errors. Game still runs.

- [ ] **Step 3: Commit**

```bash
git add src/game/GameState.ts
git commit -m "feat: add GameState singleton with localStorage persistence"
```

---

### Task 4: MenuScene

**Files:**

- Modify: `src/game/scenes/MenuScene.ts`

- [ ] **Step 1: Implement MenuScene with title, highscore, play button**

Replace `src/game/scenes/MenuScene.ts`:

```ts
import { Scene } from "phaser";
import { GameState } from "../GameState";

export class MenuScene extends Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const cx = 360;

    this.add
      .text(cx, 300, "ROCKET\nBUILDER", {
        fontSize: "72px",
        color: "#ff6b35",
        fontFamily: "monospace",
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 500, `HIGHSCORE: ${GameState.highscore}`, {
        fontSize: "28px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    const playBtn = this.add
      .text(cx, 700, "[ PLAY ]", {
        fontSize: "48px",
        color: "#4a9eff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playBtn.on("pointerover", () => playBtn.setColor("#ffffff"));
    playBtn.on("pointerout", () => playBtn.setColor("#4a9eff"));
    playBtn.on("pointerdown", () => {
      this.scene.start("BuildScene");
    });

    this.add
      .text(cx, 1100, "MACHINES JAM 2026", {
        fontSize: "20px",
        color: "#666666",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Expected: Title "ROCKET BUILDER" in orange, highscore at 0, clickable PLAY button in blue that navigates to BuildScene placeholder.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/MenuScene.ts
git commit -m "feat: implement MenuScene with title, highscore, play button"
```

---

### Task 5: BuildScene — Slot UI + Part Selection

**Files:**

- Modify: `src/game/scenes/BuildScene.ts`

- [ ] **Step 1: Implement BuildScene with slot display and part selection**

Replace `src/game/scenes/BuildScene.ts`:

```ts
import { Scene, GameObjects } from "phaser";
import { GameState } from "../GameState";
import {
  PARTS,
  getPartsForSlot,
  BUILD_BUDGET,
  SlotType,
  PartDef,
} from "../parts";

interface SlotUI {
  key: "nose" | "body" | "engine" | "leftModule" | "rightModule";
  label: string;
  slotType: SlotType;
  x: number;
  y: number;
  w: number;
  h: number;
}

const SLOTS: SlotUI[] = [
  {
    key: "nose",
    label: "NOSE",
    slotType: "nose",
    x: 360,
    y: 300,
    w: 80,
    h: 60,
  },
  {
    key: "body",
    label: "BODY",
    slotType: "body",
    x: 360,
    y: 420,
    w: 100,
    h: 100,
  },
  {
    key: "leftModule",
    label: "LEFT",
    slotType: "module",
    x: 240,
    y: 420,
    w: 70,
    h: 70,
  },
  {
    key: "rightModule",
    label: "RIGHT",
    slotType: "module",
    x: 480,
    y: 420,
    w: 70,
    h: 70,
  },
  {
    key: "engine",
    label: "ENGINE",
    slotType: "engine",
    x: 360,
    y: 560,
    w: 100,
    h: 80,
  },
];

export class BuildScene extends Scene {
  private budgetText!: GameObjects.Text;
  private gearsText!: GameObjects.Text;
  private slotLabels: Map<string, GameObjects.Text> = new Map();
  private partPanel: GameObjects.Container | null = null;
  private launchBtn!: GameObjects.Text;

  constructor() {
    super("BuildScene");
  }

  create() {
    // Header
    this.budgetText = this.add.text(20, 30, "", {
      fontSize: "24px",
      color: "#ffffff",
      fontFamily: "monospace",
    });

    this.gearsText = this.add
      .text(700, 30, "", {
        fontSize: "24px",
        color: "#ffcc00",
        fontFamily: "monospace",
      })
      .setOrigin(1, 0);

    this.add
      .text(360, 120, "BUILD YOUR ROCKET", {
        fontSize: "36px",
        color: "#ff6b35",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Draw slots
    for (const slot of SLOTS) {
      const rect = this.add
        .rectangle(slot.x, slot.y, slot.w, slot.h)
        .setStrokeStyle(2, 0x4a9eff)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(slot.x, slot.y, slot.label, {
          fontSize: "16px",
          color: "#4a9eff",
          fontFamily: "monospace",
        })
        .setOrigin(0.5);

      this.slotLabels.set(slot.key, label);

      rect.on("pointerdown", () => this.openPartPanel(slot));
      rect.on("pointerover", () => rect.setStrokeStyle(3, 0xffffff));
      rect.on("pointerout", () => rect.setStrokeStyle(2, 0x4a9eff));
    }

    // Launch button
    this.launchBtn = this.add
      .text(360, 750, "[ LAUNCH ]", {
        fontSize: "48px",
        color: "#ff4444",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.launchBtn.on("pointerover", () => this.launchBtn.setColor("#ff8888"));
    this.launchBtn.on("pointerout", () => this.launchBtn.setColor("#ff4444"));
    this.launchBtn.on("pointerdown", () => this.launch());

    // Back button
    const backBtn = this.add
      .text(60, 1230, "< MENU", {
        fontSize: "24px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backBtn.on("pointerdown", () => this.scene.start("MenuScene"));

    this.refreshUI();
  }

  private refreshUI() {
    const used = GameState.getBudgetUsed();
    this.budgetText.setText(`BUDGET: ${used}/${BUILD_BUDGET}`);
    this.budgetText.setColor(used > BUILD_BUDGET ? "#ff4444" : "#ffffff");
    this.gearsText.setText(`${GameState.currency}G`);

    for (const slot of SLOTS) {
      const partId = GameState.rocketConfig[slot.key];
      const label = this.slotLabels.get(slot.key)!;
      if (partId) {
        const part = PARTS[partId];
        label.setText(part.name);
        label.setColor("#ffffff");
      } else {
        label.setText(slot.label);
        label.setColor("#4a9eff");
      }
    }

    const hasEngine = !!GameState.rocketConfig.engine;
    const overBudget = GameState.getBudgetUsed() > BUILD_BUDGET;
    this.launchBtn.setAlpha(hasEngine && !overBudget ? 1 : 0.3);
  }

  private openPartPanel(slot: SlotUI) {
    this.closePartPanel();

    const parts = getPartsForSlot(slot.slotType);
    const panelX = 360;
    const panelY = 900;
    const container = this.add.container(panelX, panelY);

    // Background
    const bg = this.add
      .rectangle(0, 0, 600, parts.length * 70 + 80, 0x2a2a3e, 0.95)
      .setOrigin(0.5, 0);
    container.add(bg);

    // Title
    const title = this.add
      .text(0, 15, `SELECT ${slot.label}`, {
        fontSize: "24px",
        color: "#ff6b35",
        fontFamily: "monospace",
      })
      .setOrigin(0.5, 0);
    container.add(title);

    // "Empty" option for optional slots
    if (slot.slotType === "module") {
      const emptyBtn = this.add
        .text(0, 60, "[ EMPTY ]", {
          fontSize: "20px",
          color: "#888888",
          fontFamily: "monospace",
        })
        .setOrigin(0.5, 0)
        .setInteractive({ useHandCursor: true });
      emptyBtn.on("pointerdown", () => {
        GameState.rocketConfig[slot.key] = null;
        this.closePartPanel();
        this.refreshUI();
      });
      container.add(emptyBtn);
    }

    const startY = slot.slotType === "module" ? 100 : 60;

    parts.forEach((part, i) => {
      const y = startY + i * 70;
      const unlocked = GameState.isUnlocked(part.id);
      const equipped = GameState.rocketConfig[slot.key] === part.id;

      const color = equipped ? "#00ff88" : unlocked ? "#ffffff" : "#666666";
      const statsStr = this.getPartStats(part);

      const nameText = this.add.text(-250, y, part.name, {
        fontSize: "22px",
        color,
        fontFamily: "monospace",
      });
      container.add(nameText);

      const statsText = this.add.text(-250, y + 24, statsStr, {
        fontSize: "14px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      });
      container.add(statsText);

      const costText = this.add
        .text(250, y, `$${part.budgetCost}`, {
          fontSize: "20px",
          color: "#ffcc00",
          fontFamily: "monospace",
        })
        .setOrigin(1, 0);
      container.add(costText);

      if (unlocked) {
        nameText.setInteractive({ useHandCursor: true });
        nameText.on("pointerdown", () => {
          GameState.rocketConfig[slot.key] = part.id;
          this.closePartPanel();
          this.refreshUI();
        });
        nameText.on("pointerover", () => nameText.setColor("#4a9eff"));
        nameText.on("pointerout", () =>
          nameText.setColor(equipped ? "#00ff88" : "#ffffff"),
        );
      } else {
        const unlockBtn = this.add
          .text(250, y + 24, `UNLOCK: ${part.unlockCost}G`, {
            fontSize: "14px",
            color:
              GameState.currency >= (part.unlockCost ?? 0)
                ? "#ffcc00"
                : "#ff4444",
            fontFamily: "monospace",
          })
          .setOrigin(1, 0)
          .setInteractive({ useHandCursor: true });
        unlockBtn.on("pointerdown", () => {
          if (GameState.unlockPart(part.id)) {
            this.closePartPanel();
            this.openPartPanel(slot);
          }
        });
        container.add(unlockBtn);
      }
    });

    this.partPanel = container;
  }

  private getPartStats(part: PartDef): string {
    const stats: string[] = [`wt:${part.weight}`];
    if (part.drag !== undefined) stats.push(`drag:${part.drag}`);
    if (part.hp !== undefined) stats.push(`hp:${part.hp}`);
    if (part.thrust !== undefined) stats.push(`thrust:${part.thrust}`);
    if (part.control !== undefined) stats.push(`ctrl:${part.control}`);
    if (part.fuelBurn !== undefined) stats.push(`burn:${part.fuelBurn}`);
    if (part.rotationDamping !== undefined)
      stats.push(`stab:${part.rotationDamping}`);
    if (part.bonusFuel !== undefined) stats.push(`+fuel:${part.bonusFuel}`);
    if (part.shieldHP !== undefined) stats.push(`shield:${part.shieldHP}`);
    return stats.join(" | ");
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

    this.scene.start("FlightScene");
  }
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Expected: Navigate from Menu → Build. See 5 slots with dashed borders. Click a slot → part list appears below. Select parts, see budget update. LAUNCH button navigates to FlightScene stub.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/BuildScene.ts
git commit -m "feat: implement BuildScene with slot UI, part selection, budget"
```

---

### Task 6: Rocket Compound Body

**Files:**

- Create: `src/game/objects/Rocket.ts`

- [ ] **Step 1: Implement Rocket class with Matter.js compound body**

Create `src/game/objects/Rocket.ts`:

```ts
import { Scene } from "phaser";
import { GameState, RocketConfig } from "../GameState";
import { PARTS, BASE_FUEL } from "../parts";

export class Rocket {
  scene: Scene;
  body!: MatterJS.BodyType;
  private config: RocketConfig;

  // Runtime state
  fuel: number;
  maxFuel: number;
  hp: number;
  maxHP: number;
  shieldHP: number;
  thrust: number;
  control: number;
  fuelBurn: number;
  dragMultiplier: number;
  angularDamping: number;
  hasMagnet: boolean;

  // Altitude tracking
  startY: number = 0;

  constructor(scene: Scene, x: number, y: number) {
    this.scene = scene;
    this.config = { ...GameState.rocketConfig };

    // Calculate stats from parts
    const nose = PARTS[this.config.nose];
    const body = PARTS[this.config.body];
    const engine = PARTS[this.config.engine];
    const leftMod = this.config.leftModule
      ? PARTS[this.config.leftModule]
      : null;
    const rightMod = this.config.rightModule
      ? PARTS[this.config.rightModule]
      : null;

    this.thrust = engine.thrust ?? 5;
    this.control = engine.control ?? 0.8;
    this.fuelBurn = engine.fuelBurn ?? 1.0;
    this.dragMultiplier = nose.drag ?? 1.0;
    this.hp = body.hp ?? 1;
    this.maxHP = this.hp;

    // Module bonuses
    let bonusFuel = 0;
    this.shieldHP = 0;
    this.angularDamping = 0.01; // base
    this.hasMagnet = false;

    for (const mod of [leftMod, rightMod]) {
      if (!mod) continue;
      if (mod.bonusFuel) bonusFuel += mod.bonusFuel;
      if (mod.shieldHP) this.shieldHP += mod.shieldHP;
      if (mod.rotationDamping) this.angularDamping = mod.rotationDamping;
    }

    this.maxFuel = BASE_FUEL + bonusFuel;
    this.fuel = this.maxFuel;

    // Calculate total weight and center of mass offset
    const totalWeight =
      (nose.weight ?? 0) +
      (body.weight ?? 0) +
      (engine.weight ?? 0) +
      (leftMod?.weight ?? 0) +
      (rightMod?.weight ?? 0);

    // Asymmetry: difference between left and right module weights
    const leftWeight = leftMod?.weight ?? 0;
    const rightWeight = rightMod?.weight ?? 0;
    const asymmetry = (rightWeight - leftWeight) * 2; // offset in pixels

    // Create compound body parts
    const parts = this.scene.matter.bodies.rectangle(x + asymmetry, y, 30, 80, {
      label: "rocket",
      frictionAir: this.angularDamping,
      density: totalWeight * 0.001,
    });

    this.body = parts;
    this.startY = y;

    this.scene.matter.world.add(this.body);
  }

  getAltitude(): number {
    return Math.max(0, this.startY - this.body.position.y);
  }

  applyThrust(delta: number) {
    if (this.fuel <= 0) return;

    const angle = this.body.angle - Math.PI / 2; // "up" direction of body
    const forceX = Math.cos(angle) * this.thrust * 0.001;
    const forceY = Math.sin(angle) * this.thrust * 0.001;

    this.scene.matter.body.applyForce(this.body, this.body.position, {
      x: forceX,
      y: forceY,
    });

    this.fuel -= this.fuelBurn * (delta / 1000);
    if (this.fuel < 0) this.fuel = 0;
  }

  applySideThrust(direction: -1 | 1) {
    const angle = this.body.angle;
    const force = direction * this.control * 0.0005;

    this.scene.matter.body.applyForce(this.body, this.body.position, {
      x: Math.cos(angle) * force,
      y: Math.sin(angle) * force,
    });
  }

  applyDrag(zoneMultiplier: number = 1) {
    const vel = this.body.velocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    if (speed < 0.1) return;

    const dragForce = this.dragMultiplier * zoneMultiplier * 0.0001;
    this.scene.matter.body.applyForce(this.body, this.body.position, {
      x: -vel.x * dragForce,
      y: -vel.y * dragForce,
    });
  }

  takeDamage(): boolean {
    if (this.shieldHP > 0) {
      this.shieldHP--;
      return false; // survived
    }
    this.hp--;
    return this.hp <= 0; // true = destroyed
  }

  destroy() {
    this.scene.matter.world.remove(this.body);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run dev`
Expected: No TypeScript errors. Note: Phaser 4 Matter.js types may differ — if `MatterJS.BodyType` doesn't resolve, check `node_modules/phaser/types` for the correct type and adjust.

- [ ] **Step 3: Commit**

```bash
git add src/game/objects/Rocket.ts
git commit -m "feat: add Rocket class with Matter.js body and part-based stats"
```

---

### Task 7: FlightScene — Core Flight

**Files:**

- Modify: `src/game/scenes/FlightScene.ts`
- Create: `src/game/systems/InputManager.ts`

- [ ] **Step 1: Implement InputManager for keyboard + touch**

Create `src/game/systems/InputManager.ts`:

```ts
import { Scene, Input } from "phaser";

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
        space: this.scene.input.keyboard.addKey("SPACE"),
        w: this.scene.input.keyboard.addKey("W"),
        a: this.scene.input.keyboard.addKey("A"),
        d: this.scene.input.keyboard.addKey("D"),
      };
    }

    // Touch / pointer
    this.scene.input.on("pointerdown", (pointer: Input.Pointer) => {
      this.updateTouch(pointer, true);
    });
    this.scene.input.on("pointermove", (pointer: Input.Pointer) => {
      if (pointer.isDown) this.updateTouch(pointer, true);
    });
    this.scene.input.on("pointerup", () => {
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
    const kbThrust = this.keys
      ? this.keys.space.isDown || this.keys.w.isDown
      : false;
    const kbLeft = this.keys ? this.keys.a.isDown : false;
    const kbRight = this.keys ? this.keys.d.isDown : false;

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
```

- [ ] **Step 2: Implement FlightScene with physics, camera, and controls**

Replace `src/game/scenes/FlightScene.ts`:

```ts
import { Scene } from "phaser";
import { Rocket } from "../objects/Rocket";
import { InputManager } from "../systems/InputManager";
import { GameState } from "../GameState";

export class FlightScene extends Scene {
  private rocket!: Rocket;
  private input!: InputManager;
  private altitude: number = 0;
  private gearsCollected: number = 0;
  private maxAltitude: number = 0;
  private isThrusting: boolean = false;

  constructor() {
    super("FlightScene");
  }

  create() {
    // World bounds — wide and tall
    this.matter.world.setBounds(-500, -50000, 1720, 51280);

    // Create rocket at bottom center
    this.rocket = new Rocket(this, 360, 1100);
    this.input = new InputManager(this);

    // Camera follows rocket
    const rocketGraphic = this.add.rectangle(
      this.rocket.body.position.x,
      this.rocket.body.position.y,
      30,
      80,
      0x4a9eff,
    );
    this.cameras.main.startFollow(rocketGraphic, false, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, 200); // rocket in lower part of screen

    // Store reference for camera tracking
    this.data.set("rocketGraphic", rocketGraphic);

    // Launch HUD as parallel scene
    this.scene.launch("HUDScene");

    // Ground
    const ground = this.matter.add.rectangle(360, 1250, 720, 100, {
      isStatic: true,
      label: "ground",
    });

    // Collision handling
    this.matter.world.on("collisionstart", (event: any) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];

        if (labels.includes("rocket") && labels.includes("obstacle")) {
          const destroyed = this.rocket.takeDamage();
          if (destroyed) this.crash();
        }

        if (labels.includes("rocket") && labels.includes("gear")) {
          const gearBody =
            pair.bodyA.label === "gear" ? pair.bodyA : pair.bodyB;
          this.collectGear(gearBody);
        }

        if (labels.includes("rocket") && labels.includes("ground")) {
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
    if (!this.rocket || !this.rocket.body) return;

    const inputState = this.input.getState();

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

    // Update rocket graphic position (for camera)
    const rocketGraphic = this.data.get(
      "rocketGraphic",
    ) as Phaser.GameObjects.Rectangle;
    if (rocketGraphic) {
      rocketGraphic.setPosition(
        this.rocket.body.position.x,
        this.rocket.body.position.y,
      );
      rocketGraphic.setRotation(this.rocket.body.angle);
    }

    // Emit data for HUD
    this.events.emit("updateHUD", {
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

  private getZoneName(): string {
    if (this.altitude < 1000) return "ATMOSPHERE";
    if (this.altitude < 3000) return "TURBULENCE";
    return "SPACE";
  }

  private collectGear(gearBody: MatterJS.BodyType) {
    this.gearsCollected++;
    this.matter.world.remove(gearBody);
  }

  private crash() {
    GameState.finishRun(this.maxAltitude, this.gearsCollected);
    this.input.destroy();
    this.rocket.destroy();
    this.scene.stop("HUDScene");
    this.scene.start("CrashScene");
  }
}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Expected: From Build → LAUNCH. See a blue rectangle (rocket placeholder). Press Space/W for thrust, A/D for side control. Rocket flies up, gravity pulls it down. Camera follows rocket.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/FlightScene.ts src/game/systems/InputManager.ts
git commit -m "feat: implement FlightScene with physics, input, camera"
```

---

### Task 8: Zones, Obstacles, and Collectibles

**Files:**

- Create: `src/game/systems/ZoneManager.ts`
- Create: `src/game/objects/Obstacle.ts`
- Create: `src/game/objects/Gear.ts`
- Modify: `src/game/scenes/FlightScene.ts`

- [ ] **Step 1: Implement Obstacle factory**

Create `src/game/objects/Obstacle.ts`:

```ts
import { Scene } from "phaser";

export type ObstacleType = "bird" | "cloud" | "asteroid";

export function spawnObstacle(
  scene: Scene,
  x: number,
  y: number,
  type: ObstacleType,
) {
  const configs = {
    bird: { w: 30, h: 20, color: 0xcc8844, speed: 1.5, label: "obstacle" },
    cloud: { w: 60, h: 40, color: 0xaaaacc, speed: 0.5, label: "obstacle" },
    asteroid: { w: 35, h: 35, color: 0x888888, speed: 3.0, label: "obstacle" },
  };

  const cfg = configs[type];

  // Visual
  const graphic = scene.add.rectangle(x, y, cfg.w, cfg.h, cfg.color);

  // Physics body
  const body = scene.matter.add.rectangle(x, y, cfg.w, cfg.h, {
    label: cfg.label,
    isSensor: false,
    frictionAir: 0,
    isStatic: false,
  });

  // Movement — birds and asteroids move horizontally
  const direction = Math.random() > 0.5 ? 1 : -1;
  scene.matter.body.setVelocity(body, {
    x: direction * cfg.speed,
    y: type === "asteroid" ? (Math.random() - 0.3) * cfg.speed : 0,
  });

  return { graphic, body, type };
}
```

- [ ] **Step 2: Implement Gear collectible**

Create `src/game/objects/Gear.ts`:

```ts
import { Scene } from "phaser";

export function spawnGear(scene: Scene, x: number, y: number) {
  const graphic = scene.add.rectangle(x, y, 16, 16, 0xffcc00);

  const body = scene.matter.add.rectangle(x, y, 16, 16, {
    label: "gear",
    isSensor: true,
    isStatic: true,
  });

  return { graphic, body };
}
```

- [ ] **Step 3: Implement ZoneManager**

Create `src/game/systems/ZoneManager.ts`:

```ts
import { Scene } from "phaser";
import { spawnObstacle, ObstacleType } from "../objects/Obstacle";
import { spawnGear } from "../objects/Gear";

interface SpawnedEntity {
  graphic: Phaser.GameObjects.Rectangle;
  body: MatterJS.BodyType;
}

export class ZoneManager {
  private scene: Scene;
  private obstacles: SpawnedEntity[] = [];
  private gears: SpawnedEntity[] = [];
  private spawnTimer: number = 0;
  private gearTimer: number = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  update(delta: number, altitude: number, rocketX: number) {
    this.spawnTimer += delta;
    this.gearTimer += delta;

    // Spawn obstacles based on zone
    const spawnInterval = this.getSpawnInterval(altitude);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacleForZone(altitude, rocketX);
    }

    // Spawn gears
    const gearInterval = altitude < 1000 ? 2000 : altitude < 3000 ? 1200 : 2500;
    if (this.gearTimer >= gearInterval) {
      this.gearTimer = 0;
      this.spawnGearNearRocket(altitude, rocketX);
    }

    // Cleanup far-away entities
    this.cleanup(rocketX, altitude);

    // Turbulence zone: apply random forces to rocket
    if (altitude >= 1000 && altitude < 3000) {
      if (Math.random() < delta / 3000) {
        this.applyTurbulence();
      }
    }
  }

  private getSpawnInterval(altitude: number): number {
    const base = 2000; // ms
    const reduction = Math.floor(altitude / 500) * 100;
    return Math.max(500, base - reduction);
  }

  private spawnObstacleForZone(altitude: number, rocketX: number) {
    let type: ObstacleType;
    if (altitude < 1000) type = "bird";
    else if (altitude < 3000) type = "cloud";
    else type = "asteroid";

    // Spawn to side of rocket, at rocket's altitude
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = rocketX + side * (400 + Math.random() * 200);
    const rocketY = 1100 - altitude; // convert altitude to world Y
    const y = rocketY - 300 - Math.random() * 600; // above rocket

    const entity = spawnObstacle(this.scene, x, y, type);
    this.obstacles.push(entity);
  }

  private spawnGearNearRocket(altitude: number, rocketX: number) {
    const x = rocketX + (Math.random() - 0.5) * 500;
    const rocketY = 1100 - altitude;
    const y = rocketY - 400 - Math.random() * 400;

    const entity = spawnGear(this.scene, x, y);
    this.gears.push(entity);
  }

  private applyTurbulence() {
    // Emit event for FlightScene to apply force to rocket
    this.scene.events.emit("turbulence", {
      x: (Math.random() - 0.5) * 0.002,
      y: 0,
    });
  }

  private cleanup(rocketX: number, altitude: number) {
    const rocketY = 1100 - altitude;
    const maxDist = 2000;

    this.obstacles = this.obstacles.filter((e) => {
      const dist =
        Math.abs(e.body.position.y - rocketY) +
        Math.abs(e.body.position.x - rocketX);
      if (dist > maxDist) {
        e.graphic.destroy();
        this.scene.matter.world.remove(e.body);
        return false;
      }
      return true;
    });

    this.gears = this.gears.filter((e) => {
      if (!e.body.id) return false; // already removed (collected)
      const dist =
        Math.abs(e.body.position.y - rocketY) +
        Math.abs(e.body.position.x - rocketX);
      if (dist > maxDist) {
        e.graphic.destroy();
        this.scene.matter.world.remove(e.body);
        return false;
      }
      return true;
    });
  }

  removeGearByBody(gearBody: MatterJS.BodyType) {
    const idx = this.gears.findIndex(
      (g) => g.body === gearBody || g.body.id === gearBody.id,
    );
    if (idx >= 0) {
      this.gears[idx].graphic.destroy();
      this.scene.matter.world.remove(this.gears[idx].body);
      this.gears.splice(idx, 1);
    }
  }

  destroy() {
    for (const e of [...this.obstacles, ...this.gears]) {
      e.graphic.destroy();
    }
    this.obstacles = [];
    this.gears = [];
  }
}
```

- [ ] **Step 4: Integrate ZoneManager into FlightScene**

In `src/game/scenes/FlightScene.ts`, add the following changes:

Add import at the top:

```ts
import { ZoneManager } from "../systems/ZoneManager";
```

Add field:

```ts
private zoneManager!: ZoneManager;
```

In `create()`, after rocket creation:

```ts
this.zoneManager = new ZoneManager(this);

// Listen for turbulence
this.events.on("turbulence", (force: { x: number; y: number }) => {
  this.matter.body.applyForce(
    this.rocket.body,
    this.rocket.body.position,
    force,
  );
});
```

In `update()`, after altitude tracking, add:

```ts
this.zoneManager.update(delta, this.altitude, this.rocket.body.position.x);
```

Update `collectGear` to use ZoneManager:

```ts
private collectGear(gearBody: MatterJS.BodyType) {
    this.gearsCollected++;
    this.zoneManager.removeGearByBody(gearBody);
}
```

In `crash()`, before scene transitions:

```ts
this.zoneManager.destroy();
```

- [ ] **Step 5: Update obstacle graphics to follow their bodies**

In `FlightScene.update()`, the obstacle/gear graphics need syncing. The simplest approach: modify `ZoneManager` to also update graphic positions in its `update()` method. Add at the end of `ZoneManager.update()`:

```ts
// Sync graphics to physics bodies
for (const e of this.obstacles) {
  e.graphic.setPosition(e.body.position.x, e.body.position.y);
  e.graphic.setRotation(e.body.angle);
}
for (const e of this.gears) {
  e.graphic.setPosition(e.body.position.x, e.body.position.y);
}
```

- [ ] **Step 6: Verify in browser**

Run: `npm run dev`
Expected: During flight, obstacles appear around the rocket. Yellow squares (gears) appear and can be collected on contact. In turbulence zone (altitude 1000-3000), random forces push the rocket.

- [ ] **Step 7: Commit**

```bash
git add src/game/objects/Obstacle.ts src/game/objects/Gear.ts src/game/systems/ZoneManager.ts src/game/scenes/FlightScene.ts
git commit -m "feat: add zones, obstacles, and collectible gears"
```

---

### Task 9: HUDScene

**Files:**

- Modify: `src/game/scenes/HUDScene.ts`

- [ ] **Step 1: Implement HUD overlay**

Replace `src/game/scenes/HUDScene.ts`:

```ts
import { Scene, GameObjects } from "phaser";

export class HUDScene extends Scene {
  private altText!: GameObjects.Text;
  private zoneText!: GameObjects.Text;
  private fuelBar!: GameObjects.Rectangle;
  private fuelBg!: GameObjects.Rectangle;
  private gearsText!: GameObjects.Text;

  constructor() {
    super("HUDScene");
  }

  create() {
    // Altitude — top left
    this.altText = this.add.text(20, 20, "ALT: 0", {
      fontSize: "28px",
      color: "#ffffff",
      fontFamily: "monospace",
      fontStyle: "bold",
    });

    this.zoneText = this.add.text(20, 55, "ATMOSPHERE", {
      fontSize: "18px",
      color: "#88aaff",
      fontFamily: "monospace",
    });

    // Fuel bar — top right
    this.add
      .text(700, 20, "FUEL", {
        fontSize: "18px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(1, 0);

    this.fuelBg = this.add
      .rectangle(570, 50, 130, 16, 0x333333)
      .setOrigin(0, 0.5);
    this.fuelBar = this.add
      .rectangle(570, 50, 130, 16, 0x44ff44)
      .setOrigin(0, 0.5);

    // Gears — under fuel
    this.gearsText = this.add
      .text(700, 70, "GEARS: 0", {
        fontSize: "20px",
        color: "#ffcc00",
        fontFamily: "monospace",
      })
      .setOrigin(1, 0);

    // Listen for updates from FlightScene
    const flightScene = this.scene.get("FlightScene");
    flightScene.events.on(
      "updateHUD",
      (data: {
        altitude: number;
        fuel: number;
        maxFuel: number;
        gears: number;
        zone: string;
      }) => {
        this.altText.setText(`ALT: ${data.altitude}`);
        this.zoneText.setText(data.zone);

        const fuelPct = Math.max(0, data.fuel / data.maxFuel);
        this.fuelBar.setSize(130 * fuelPct, 16);
        this.fuelBar.setFillStyle(fuelPct > 0.3 ? 0x44ff44 : 0xff4444);

        this.gearsText.setText(`GEARS: ${data.gears}`);

        // Zone color
        const zoneColors: Record<string, string> = {
          ATMOSPHERE: "#88aaff",
          TURBULENCE: "#ff8844",
          SPACE: "#cc88ff",
        };
        this.zoneText.setColor(zoneColors[data.zone] ?? "#88aaff");
      },
    );
  }
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Expected: During flight, HUD shows altitude counter increasing, fuel bar depleting, gears count, and zone name changing color.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/HUDScene.ts
git commit -m "feat: implement HUD overlay with altitude, fuel, gears, zone"
```

---

### Task 10: CrashScene + Scoring

**Files:**

- Modify: `src/game/scenes/CrashScene.ts`

- [ ] **Step 1: Implement CrashScene with run summary**

Replace `src/game/scenes/CrashScene.ts`:

```ts
import { Scene } from "phaser";
import { GameState } from "../GameState";

export class CrashScene extends Scene {
  constructor() {
    super("CrashScene");
  }

  create() {
    const cx = 360;
    const run = GameState.lastRun;
    const isNewHighscore = run.score >= GameState.highscore && run.score > 0;

    this.add
      .text(cx, 200, "CRASH!", {
        fontSize: "64px",
        color: "#ff4444",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Stats
    this.add
      .text(cx, 380, `MAX ALTITUDE: ${run.altitude}`, {
        fontSize: "28px",
        color: "#ffffff",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 430, `GEARS COLLECTED: ${run.gears}`, {
        fontSize: "28px",
        color: "#ffcc00",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 500, `SCORE: ${run.score}`, {
        fontSize: "36px",
        color: "#4a9eff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (isNewHighscore) {
      this.add
        .text(cx, 560, "NEW HIGHSCORE!", {
          fontSize: "32px",
          color: "#ff6b35",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    this.add
      .text(cx, 620, `HIGHSCORE: ${GameState.highscore}`, {
        fontSize: "22px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 680, `WALLET: ${GameState.currency}G`, {
        fontSize: "22px",
        color: "#ffcc00",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Buttons
    const rebuildBtn = this.add
      .text(cx, 850, "[ REBUILD ]", {
        fontSize: "40px",
        color: "#4a9eff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    rebuildBtn.on("pointerover", () => rebuildBtn.setColor("#ffffff"));
    rebuildBtn.on("pointerout", () => rebuildBtn.setColor("#4a9eff"));
    rebuildBtn.on("pointerdown", () => this.scene.start("BuildScene"));

    const menuBtn = this.add
      .text(cx, 950, "[ MENU ]", {
        fontSize: "32px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menuBtn.on("pointerover", () => menuBtn.setColor("#ffffff"));
    menuBtn.on("pointerout", () => menuBtn.setColor("#888888"));
    menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
  }
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Expected: Full game loop works: Menu → Build → Flight → Crash → shows altitude, gears, score, highscore. REBUILD goes back to Build, MENU goes to Menu. Highscore persists across page reloads.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/CrashScene.ts
git commit -m "feat: implement CrashScene with scoring and run summary"
```

---

### Task 11: Juice — Particles, Screen Shake, Background

**Files:**

- Modify: `src/game/scenes/FlightScene.ts`

- [ ] **Step 1: Add engine particles**

In `FlightScene`, add a particle emitter that follows the rocket's engine position. In `create()`:

```ts
// Engine particles
this.engineEmitter = this.add.particles(0, 0, {
  speed: { min: 50, max: 150 },
  angle: { min: 80, max: 100 }, // downward
  scale: { start: 0.5, end: 0 },
  lifespan: 400,
  frequency: 30,
  tint: [0xff4400, 0xff8800, 0xffcc00],
  emitting: false,
});
```

Note: Phaser 4 particle API may differ from Phaser 3. Check `node_modules/phaser/types` for exact API. The concept: orange/yellow particles emitting downward from engine position when thrusting.

In `update()`, sync emitter position and toggle:

```ts
// Update engine particles
if (this.engineEmitter) {
  this.engineEmitter.setPosition(
    this.rocket.body.position.x,
    this.rocket.body.position.y + 40,
  );
  this.engineEmitter.emitting = this.isThrusting;
}
```

- [ ] **Step 2: Add screen shake on crash**

In `crash()` method, before scene transition:

```ts
this.cameras.main.shake(300, 0.02);
this.time.delayedCall(400, () => {
  GameState.finishRun(this.maxAltitude, this.gearsCollected);
  this.zoneManager.destroy();
  this.input.destroy();
  this.rocket.destroy();
  this.scene.stop("HUDScene");
  this.scene.start("CrashScene");
});
```

- [ ] **Step 3: Add altitude-based background color transition**

In `FlightScene.update()`:

```ts
// Background color transition
const alt = this.altitude;
let bgColor: number;
if (alt < 1000) {
  bgColor = this.lerpColor(0x87ceeb, 0x2a1a4e, alt / 1000); // sky blue → dark purple
} else if (alt < 3000) {
  bgColor = this.lerpColor(0x2a1a4e, 0x0a0a1a, (alt - 1000) / 2000); // dark purple → near black
} else {
  bgColor = 0x0a0a1a; // space black
}
this.cameras.main.setBackgroundColor(bgColor);
```

Add helper method:

```ts
private lerpColor(from: number, to: number, t: number): number {
    t = Math.max(0, Math.min(1, t));
    const r1 = (from >> 16) & 0xff, g1 = (from >> 8) & 0xff, b1 = from & 0xff;
    const r2 = (to >> 16) & 0xff, g2 = (to >> 8) & 0xff, b2 = to & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
}
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Expected: Orange particles emit from rocket when thrusting. Screen shakes on crash. Background transitions from sky blue → dark → black as altitude increases.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/FlightScene.ts
git commit -m "feat: add engine particles, screen shake, background transitions"
```

---

### Task 12: Pixel Art Placeholder Sprites

**Files:**

- Create placeholder sprites in `public/assets/`
- Modify all scenes to use sprites instead of rectangles

- [ ] **Step 1: Create placeholder pixel art**

For the game jam, create simple colored rectangle sprites as temporary pixel art (8x8 to 32x32 PNGs). These can be created programmatically with Phaser's `generateTexture` or drawn manually.

Option: use Phaser's built-in graphics to draw textures at boot time. Add to `MenuScene.preload()` or a dedicated `BootScene`:

```ts
// Generate placeholder textures
const gfx = this.add.graphics();

// Rocket body
gfx.fillStyle(0x4a9eff);
gfx.fillRect(0, 0, 30, 80);
gfx.generateTexture("rocket_body", 30, 80);

// Gear collectible
gfx.clear();
gfx.fillStyle(0xffcc00);
gfx.fillRect(0, 0, 16, 16);
gfx.generateTexture("gear", 16, 16);

// Obstacle
gfx.clear();
gfx.fillStyle(0xff4444);
gfx.fillRect(0, 0, 30, 30);
gfx.generateTexture("obstacle", 30, 30);

gfx.destroy();
```

This is optional — the game works with rectangle graphics. Replace with real pixel art as time allows.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add placeholder sprite generation"
```

---

### Task 13: Sound Effects

**Files:**

- Modify: `src/game/scenes/FlightScene.ts`
- Modify: `src/game/scenes/BuildScene.ts`

- [ ] **Step 1: Generate or source sound effects**

For game jam, use procedural audio or free SFX. Needed sounds:

- `thrust` — looping engine hum
- `crash` — explosion
- `gear_collect` — pickup ding
- `ui_click` — button click

Place audio files in `public/assets/sfx/`.

Option: use the Web Audio API to generate simple synth sounds at runtime (no files needed). Create a utility:

```ts
// src/game/systems/SoundGen.ts
export function playThrustSound(scene: Phaser.Scene) {
  // Use Phaser's sound manager or Web Audio
  // Implementation depends on available audio files
}
```

This task is flexible — implement with whatever audio is available. Sound can be added incrementally.

- [ ] **Step 2: Integrate sounds into FlightScene**

Add sound playback calls:

- On thrust start: play thrust loop
- On thrust stop: stop thrust loop
- On gear collect: play pickup sound
- On crash: play explosion sound
- On UI button clicks: play click sound

- [ ] **Step 3: Verify sounds play in browser**

- [ ] **Step 4: Commit**

```bash
git add src/game/systems/SoundGen.ts public/assets/sfx/
git commit -m "feat: add sound effects"
```

---

### Task 14: Final Polish and Tuning

- [ ] **Step 1: Disable Matter.js debug rendering**

In `src/game/main.ts`, change `debug: true` to `debug: false`.

- [ ] **Step 2: Playtest and tune values**

Play the game multiple times and adjust:

- `gravity.y` in config (start: 1, try 0.5-2)
- `thrust` values in parts (too high = uncontrollable, too low = boring)
- `fuelBurn` rates (runs should last 30-60 seconds)
- Obstacle spawn rates (should feel challenging but fair)
- Budget limit (100 — should allow interesting builds but not everything)

- [ ] **Step 3: Add .gitignore entry for .superpowers**

Add `.superpowers/` to `.gitignore` if not already there.

- [ ] **Step 4: Update game title and metadata**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: final polish, tuning, release prep"
```

---

## Implementation Order Summary

| Task | Component                    | Dependencies |
| ---- | ---------------------------- | ------------ |
| 1    | Project Setup                | none         |
| 2    | Parts Data                   | none         |
| 3    | GameState                    | Task 2       |
| 4    | MenuScene                    | Task 3       |
| 5    | BuildScene                   | Tasks 2, 3   |
| 6    | Rocket Body                  | Tasks 2, 3   |
| 7    | FlightScene Core             | Tasks 3, 6   |
| 8    | Zones + Obstacles + Gears    | Task 7       |
| 9    | HUDScene                     | Task 7       |
| 10   | CrashScene + Scoring         | Tasks 3, 7   |
| 11   | Juice (particles, shake, bg) | Task 7       |
| 12   | Placeholder Sprites          | any time     |
| 13   | Sound Effects                | any time     |
| 14   | Final Polish                 | all above    |
