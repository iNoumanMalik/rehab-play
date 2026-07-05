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
}
