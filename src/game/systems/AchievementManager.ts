export interface AchievementDef {
  id: string;
  name: string;
  altitudeThreshold?: number;
  gearsThreshold?: number;
  reward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'alt-5000', name: 'Sky High', altitudeThreshold: 5000, reward: 5 },
  { id: 'enter-space', name: 'Space Explorer', altitudeThreshold: 15000, reward: 15 },
  { id: 'alt-10000', name: 'Cloud Breaker', altitudeThreshold: 10000, reward: 10 },
  { id: 'alt-20000', name: 'Stratosphere', altitudeThreshold: 20000, reward: 20 },
  { id: 'alt-50000', name: 'Orbit Reached', altitudeThreshold: 50000, reward: 50 },
  { id: 'alt-100000', name: 'To The Moon', altitudeThreshold: 100000, reward: 100 },
  { id: 'gears-10', name: 'Gear Collector', gearsThreshold: 10, reward: 5 },
  { id: 'gears-50', name: 'Gear Hoarder', gearsThreshold: 50, reward: 25 },
  { id: 'gears-100', name: 'Gear Tycoon', gearsThreshold: 100, reward: 50 },
];

export function checkAchievements(
  maxAltitude: number,
  alreadyUnlocked: string[],
  wavedashReady: boolean,
  gears: number = 0
): string[] {
  const newlyUnlocked: string[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(ach.id)) continue;
    const altOk = ach.altitudeThreshold !== undefined && maxAltitude >= ach.altitudeThreshold;
    const gearsOk = ach.gearsThreshold !== undefined && gears >= ach.gearsThreshold;
    if (altOk || gearsOk) {
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
