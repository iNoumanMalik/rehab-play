export class StorageService {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(`rehab_${key}`);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`rehab_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('StorageService.set failed:', e);
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(`rehab_${key}`);
  }

  static update<T>(key: string, updater: (prev: T) => T, defaultValue: T): T {
    const prev = StorageService.get(key, defaultValue);
    const next = updater(prev);
    StorageService.set(key, next);
    return next;
  }

  /**
   * Clears XP/level/streak, session history, achievements, and every
   * per-exercise calibration baseline — everything that represents "progress"
   * — while deliberately leaving accessibility/audio/gameplay settings alone
   * (resetting progress and resetting preferences are different user intents).
   */
  static resetProgress(): void {
    const KEYS = ['progression', 'session_history', 'total_score', 'total_sessions', 'unlocked_achievements'];
    for (const k of KEYS) StorageService.remove(k);

    const calibPrefix = 'rehab_calib_';
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(calibPrefix)) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }
}
