# Achievements System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an achievement system that unlocks achievements based on altitude milestones and zone transitions, with Wavedash integration and non-intrusive bottom-of-screen notifications.

**Architecture:** `AchievementManager` holds achievement definitions and checks conditions after each run via `GameState.finishRun()`. Unlocked achievements are persisted in `localStorage` (via `SaveData`) and synced to Wavedash. `HUDScene` displays a queued bottom-banner notification with tween animation.

**Tech Stack:** Phaser 3 (tweens, text, rectangles), Wavedash JS SDK (setAchievement, getAchievement, storeStats), localStorage

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/game/systems/AchievementManager.ts` | Create | Achievement definitions, condition checking, unlock logic, Wavedash sync |
| `src/game/GameState.ts` | Modify | Add `unlockedAchievements: string[]` to SaveData, call AchievementManager from `finishRun()` |
| `src/game/wavedash.d.ts` | Modify | Add `setAchievement`, `getAchievement`, `storeStats` type declarations |
| `src/game/scenes/HUDScene.ts` | Modify | Achievement notification banner with queue and tween animation |

---

### Task 1: Wavedash type declarations

**Files:**
- Modify: `src/game/wavedash.d.ts`

- [ ] **Step 1: Add achievement and stats method declarations**

Add these methods to the `WavedashJS` namespace in `src/game/wavedash.d.ts`, after the existing `uploadLeaderboardScore` declaration:

```typescript
function setAchievement(achievementName: string): void;
function getAchievement(achievementName: string): boolean;
function storeStats(): void;
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/game/wavedash.d.ts
git commit -m "feat: add Wavedash achievement type declarations"
```

---

### Task 2: AchievementManager

**Files:**
- Create: `src/game/systems/AchievementManager.ts`

- [ ] **Step 1: Create AchievementManager with definitions and check logic**

Create `src/game/systems/AchievementManager.ts`:

```typescript
export interface AchievementDef {
  id: string;
  name: string;
  altitudeThreshold: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'enter-turbulence', name: 'Turbulence Zone', altitudeThreshold: 5000 },
  { id: 'alt-5000', name: 'Sky High', altitudeThreshold: 5000 },
  { id: 'enter-space', name: 'Space Explorer', altitudeThreshold: 15000 },
  { id: 'alt-10000', name: 'Cloud Breaker', altitudeThreshold: 10000 },
  { id: 'alt-20000', name: 'Stratosphere', altitudeThreshold: 20000 },
  { id: 'alt-50000', name: 'Orbit Reached', altitudeThreshold: 50000 },
  { id: 'alt-100000', name: 'To The Moon', altitudeThreshold: 100000 },
];

export function checkAchievements(
  maxAltitude: number,
  alreadyUnlocked: string[],
  wavedashReady: boolean
): string[] {
  const newlyUnlocked: string[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(ach.id)) continue;
    if (maxAltitude >= ach.altitudeThreshold) {
      newlyUnlocked.push(ach.id);

      if (typeof WavedashJS !== 'undefined' && wavedashReady) {
        try {
          WavedashJS.setAchievement(ach.id);
        } catch (e) {
          console.warn('Wavedash setAchievement failed:', e);
        }
      }
    }
  }

  if (newlyUnlocked.length > 0 && typeof WavedashJS !== 'undefined' && wavedashReady) {
    try {
      WavedashJS.storeStats();
    } catch (e) {
      console.warn('Wavedash storeStats failed:', e);
    }
  }

  return newlyUnlocked;
}

export function getAchievementName(id: string): string {
  return ACHIEVEMENTS.find(a => a.id === id)?.name ?? id;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/game/systems/AchievementManager.ts
git commit -m "feat: add AchievementManager with definitions and check logic"
```

---

### Task 3: Integrate achievements into GameState

**Files:**
- Modify: `src/game/GameState.ts`

- [ ] **Step 1: Add unlockedAchievements to SaveData and GameStateClass**

In `src/game/GameState.ts`, add `unlockedAchievements` to the `SaveData` interface:

```typescript
interface SaveData {
    currency: number;
    highscore: number;
    unlockedParts: string[];
    unlockedAchievements: string[];
}
```

Add the field to `GameStateClass`, after `wavedashReady`:

```typescript
unlockedAchievements: string[] = [];
```

Add a new field to track newly unlocked achievements for HUD notification:

```typescript
pendingAchievementNotifications: string[] = [];
```

- [ ] **Step 2: Update save() to persist achievements**

In the `save()` method, add `unlockedAchievements` to the SaveData object:

```typescript
save() {
    const data: SaveData = {
        currency: this.currency,
        highscore: this.highscore,
        unlockedParts: this.unlockedParts,
        unlockedAchievements: this.unlockedAchievements,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
```

- [ ] **Step 3: Update load() to restore achievements**

In the `load()` method, add loading of achievements:

```typescript
this.unlockedAchievements = data.unlockedAchievements ?? [];
```

Add this line after `this.unlockedParts = data.unlockedParts ?? [];`

- [ ] **Step 4: Add import and call checkAchievements in finishRun()**

Add import at top of file:

```typescript
import { checkAchievements } from './systems/AchievementManager';
```

In `finishRun()`, after `this.submitToLeaderboard(Math.floor(altitude));`, add:

```typescript
const newlyUnlocked = checkAchievements(
    Math.floor(altitude),
    this.unlockedAchievements,
    this.wavedashReady
);
if (newlyUnlocked.length > 0) {
    this.unlockedAchievements.push(...newlyUnlocked);
    this.pendingAchievementNotifications.push(...newlyUnlocked);
    this.save();
}
```

- [ ] **Step 5: Update resetSave() to clear achievements**

In `resetSave()`, add after `this.unlockedParts = [];`:

```typescript
this.unlockedAchievements = [];
this.pendingAchievementNotifications = [];
```

- [ ] **Step 6: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 7: Commit**

```bash
git add src/game/GameState.ts
git commit -m "feat: integrate achievement tracking into GameState"
```

---

### Task 4: Achievement notification in HUDScene

**Files:**
- Modify: `src/game/scenes/HUDScene.ts`

- [ ] **Step 1: Add import and notification state**

Add import at top of `src/game/scenes/HUDScene.ts`:

```typescript
import { GameState } from '../GameState';
import { getAchievementName } from '../systems/AchievementManager';
```

Add private fields to `HUDScene` class:

```typescript
private notificationQueue: string[] = [];
private isShowingNotification: boolean = false;
```

- [ ] **Step 2: Add checkPendingAchievements method**

Add this method to the `HUDScene` class. It should be called when entering the HUD (at the end of `create()`):

```typescript
private checkPendingAchievements() {
    if (GameState.pendingAchievementNotifications.length > 0) {
        this.notificationQueue.push(...GameState.pendingAchievementNotifications);
        GameState.pendingAchievementNotifications = [];
        this.showNextNotification();
    }
}
```

Call `this.checkPendingAchievements();` at the end of `create()`.

Also listen for run-time achievement checks — add before the `checkPendingAchievements()` call:

```typescript
this.time.addEvent({
    delay: 1000,
    loop: true,
    callback: () => {
        if (GameState.pendingAchievementNotifications.length > 0) {
            this.notificationQueue.push(...GameState.pendingAchievementNotifications);
            GameState.pendingAchievementNotifications = [];
            if (!this.isShowingNotification) {
                this.showNextNotification();
            }
        }
    },
});
```

- [ ] **Step 3: Add showNextNotification method**

Add this method to `HUDScene`:

```typescript
private showNextNotification() {
    if (this.notificationQueue.length === 0) {
        this.isShowingNotification = false;
        return;
    }

    this.isShowingNotification = true;
    const achievementId = this.notificationQueue.shift()!;
    const name = getAchievementName(achievementId);

    const screenH = this.cameras.main.height;
    const bannerY = screenH + 30;
    const targetY = screenH - 50;

    const bg = this.add.rectangle(360, bannerY, 400, 50, 0x000000, 0.8)
        .setStrokeStyle(1, 0xffcc00);

    const text = this.add.text(360, bannerY, `ACHIEVEMENT: ${name}`, {
        fontSize: '16px',
        color: '#ffcc00',
        fontFamily: 'monospace',
        fontStyle: 'bold',
    }).setOrigin(0.5);

    // Slide in from bottom
    this.tweens.add({
        targets: [bg, text],
        y: targetY,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
            // Hold for 3 seconds, then slide out
            this.time.delayedCall(3000, () => {
                this.tweens.add({
                    targets: [bg, text],
                    y: screenH + 30,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => {
                        bg.destroy();
                        text.destroy();
                        this.showNextNotification();
                    },
                });
            });
        },
    });
}
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 5: Manual test in browser**

Run: `npm run dev`

Test scenarios:
1. Launch rocket, reach altitude >5000 — should see 2 notifications (Turbulence Zone + Sky High) slide in from bottom one after another
2. Crash and relaunch — same achievements should NOT trigger again
3. Reach >15000 — should see Space Explorer notification
4. Notifications should not obscure HUD (altitude/fuel at top)

- [ ] **Step 6: Commit**

```bash
git add src/game/scenes/HUDScene.ts
git commit -m "feat: add achievement unlock notification banner in HUD"
```
