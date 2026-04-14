import { PARTS } from './parts';
import { checkAchievements } from './systems/AchievementManager';

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
    time: number;
}

interface SaveData {
    currency: number;
    highscore: number;
    unlockedParts: string[];
    unlockedAchievements: string[];
    musicVolume?: number;
    sfxVolume?: number;
    musicMuted?: boolean;
    sfxMuted?: boolean;
}

class GameStateClass {
    currency: number = 0;
    highscore: number = 0;
    unlockedParts: string[] = [];
    wavedashReady: boolean = false;
    unlockedAchievements: string[] = [];
    pendingAchievementNotifications: string[] = [];
    musicVolume: number = 0.5;
    sfxVolume: number = 0.5;
    musicMuted: boolean = false;
    sfxMuted: boolean = false;

    getMusicVolume(): number {
        return this.musicMuted ? 0 : this.musicVolume;
    }

    getSfxVolume(): number {
        return this.sfxMuted ? 0 : this.sfxVolume;
    }

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
        time: 0,
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

    finishRun(altitude: number, gears: number, time: number = 0) {
        const score = Math.floor(altitude) + gears * 10;
        this.lastRun = { altitude: Math.floor(altitude), gears, score, time };
        this.currency += gears;
        if (score > this.highscore) {
            this.highscore = score;
        }
        this.save();
        this.submitToLeaderboard(Math.floor(altitude), gears);

        const newlyUnlocked = checkAchievements(
            Math.floor(altitude),
            this.unlockedAchievements,
            this.wavedashReady,
            gears
        );
        if (newlyUnlocked.length > 0) {
            this.unlockedAchievements.push(...newlyUnlocked);
            this.pendingAchievementNotifications.push(...newlyUnlocked);
            this.save();
        }
    }

    private async submitToLeaderboard(altitude: number, gears: number) {
        if (typeof WavedashJS === 'undefined' || !this.wavedashReady) return;
        try {
            const altResp = await WavedashJS.getOrCreateLeaderboard('max-altitude', 1, 0);
            await WavedashJS.uploadLeaderboardScore(altResp.data.id, altitude, true);
        } catch (e) {
            console.warn('Wavedash altitude leaderboard submit failed:', e);
        }
        try {
            const gearsResp = await WavedashJS.getOrCreateLeaderboard('max-gears', 1, 0);
            await WavedashJS.uploadLeaderboardScore(gearsResp.data.id, gears, true);
        } catch (e) {
            console.warn('Wavedash gears leaderboard submit failed:', e);
        }
    }

    save() {
        const data: SaveData = {
            currency: this.currency,
            highscore: this.highscore,
            unlockedParts: this.unlockedParts,
            unlockedAchievements: this.unlockedAchievements,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            musicMuted: this.musicMuted,
            sfxMuted: this.sfxMuted,
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
            this.unlockedAchievements = data.unlockedAchievements ?? [];
            this.musicVolume = data.musicVolume ?? 0.5;
            this.sfxVolume = data.sfxVolume ?? 0.5;
            this.musicMuted = data.musicMuted ?? false;
            this.sfxMuted = data.sfxMuted ?? false;
        } catch {
            // corrupted save, start fresh
        }
    }

    resetSave() {
        localStorage.removeItem(STORAGE_KEY);
        this.currency = 0;
        this.highscore = 0;
        this.unlockedParts = [];
        this.unlockedAchievements = [];
        this.pendingAchievementNotifications = [];
        this.initDefaultUnlocks();
    }
}

export const GameState = new GameStateClass();
