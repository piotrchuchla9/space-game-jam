import { PARTS } from './parts';

const STORAGE_KEY = 'rocketbuilder_save';

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
        nose: 'standardCone',
        body: 'lightFrame',
        engine: 'basicEngine',
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
            .filter(p => p.unlockCost === null)
            .map(p => p.id);
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
        const slots = ['nose', 'body', 'engine', 'leftModule', 'rightModule'] as const;
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
