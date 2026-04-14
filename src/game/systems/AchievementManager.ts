export interface AchievementDef {
  id: string;
  name: string;
  altitudeThreshold: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
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
