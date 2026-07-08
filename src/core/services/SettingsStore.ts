import { StorageService } from './StorageService';

export interface Settings {
  musicOn: boolean;
  sfxOn: boolean;
  volume: number; // 0..1 master
  reducedMotion: boolean;
  colorblind: boolean;
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const DEFAULTS: Settings = {
  musicOn: true,
  sfxOn: true,
  volume: 0.6,
  reducedMotion: prefersReducedMotion(),
  colorblind: false,
};

/**
 * A tiny observable settings store. Lives outside React so non-React game
 * scenes can read `reducedMotion` / `colorblind` synchronously each frame,
 * while the UI subscribes through useSettings (useSyncExternalStore).
 */
class SettingsStore {
  private state: Settings;
  private listeners = new Set<() => void>();

  constructor() {
    this.state = { ...DEFAULTS, ...StorageService.get<Partial<Settings>>('settings', {}) };
  }

  get = (): Settings => this.state;

  set(patch: Partial<Settings>): void {
    this.state = { ...this.state, ...patch };
    StorageService.set('settings', this.state);
    this.listeners.forEach(l => l());
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
}

export const settingsStore = new SettingsStore();
