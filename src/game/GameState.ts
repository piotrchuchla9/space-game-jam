import { PARTS } from './parts';
import { ACHIEVEMENTS, checkAchievements } from './systems/AchievementManager';

const STORAGE_KEY = 'rocketbuilder_save';

export interface RocketConfig {
    nose: string;
    body: string;
    engine: string;
    wings: string | null;
    fuel: string | null;
}

export interface LastRun {
    altitude: number;
    gears: number;
    score: number;
    time: number;
    maxSpeed: number;
}

interface SaveData {
    currency: number;
    highscore: number;
    unlockedParts: string[];
    unlockedAchievements: string[];
    claimedAchievements?: string[];
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
    claimedAchievements: string[] = [];
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
        nose: 'nose_1',
        body: 'body_9',
        engine: 'eng_3',
        wings: null,
        fuel: null,
    };

    lastRun: LastRun = {
        altitude: 0,
        gears: 0,
        score: 0,
        time: 0,
        maxSpeed: 0,
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

    claimAchievement(id: string): number | null {
        if (!this.unlockedAchievements.includes(id)) return null;
        if (this.claimedAchievements.includes(id)) return null;
        const def = ACHIEVEMENTS.find(a => a.id === id);
        if (!def) return null;
        this.currency += def.reward;
        this.claimedAchievements.push(id);
        this.save();
        return def.reward;
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

    finishRun(altitude: number, gears: number, time: number = 0, maxSpeed: number = 0) {
        const score = Math.floor(altitude) + gears * 10;
        this.lastRun = { altitude: Math.floor(altitude), gears, score, time, maxSpeed };
        this.currency += gears;
        if (score > this.highscore) {
            this.highscore = score;
        }
        this.save();
        this.submitToLeaderboard(Math.floor(altitude), gears, maxSpeed);

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

    async submitMoonTime(timeSeconds: number) {
        if (typeof WavedashJS === 'undefined' || !this.wavedashReady) return;
        try {
            // sortOrder=0 → ascending (shortest time first)
            // displayType=2 → milliseconds (formatted as time on the leaderboard UI)
            const resp = await WavedashJS.getOrCreateLeaderboard('time-to-moon-v2', 0, 2);
            // Score stored as milliseconds — matches displayType=2 formatting
            const ms = Math.max(1, Math.round(timeSeconds * 1000));
            await WavedashJS.uploadLeaderboardScore(resp.data.id, ms, true);
        } catch (e) {
            console.warn('Wavedash time-to-moon leaderboard submit failed:', e);
        }
    }

    private async submitToLeaderboard(altitude: number, gears: number, maxSpeed: number) {
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
        try {
            const speedResp = await WavedashJS.getOrCreateLeaderboard('max-speed', 1, 0);
            await WavedashJS.uploadLeaderboardScore(speedResp.data.id, maxSpeed, true);
        } catch (e) {
            console.warn('Wavedash speed leaderboard submit failed:', e);
        }
    }

    save() {
        const data: SaveData = {
            currency: this.currency,
            highscore: this.highscore,
            unlockedParts: this.unlockedParts,
            unlockedAchievements: this.unlockedAchievements,
            claimedAchievements: this.claimedAchievements,
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
            this.claimedAchievements = data.claimedAchievements ?? [];
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
        this.claimedAchievements = [];
        this.pendingAchievementNotifications = [];
        this.initDefaultUnlocks();
    }
}

export const GameState = new GameStateClass();
