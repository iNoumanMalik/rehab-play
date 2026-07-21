import { StorageService } from './StorageService';

export type Theme = 'dark' | 'light';
export type TextSize = 'sm' | 'md' | 'lg' | 'xl';
export type DominantArm = 'right' | 'left' | 'both';
export type Difficulty = 'gentle' | 'standard' | 'challenging';
export type Language = 'en';

export interface Settings {
  // Audio
  musicOn: boolean;
  sfxOn: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  voiceGuidanceOn: boolean;
  voiceVolume: number; // 0..1
  captionsOn: boolean; // show on-screen captions when voice guidance speaks

  // Display / accessibility
  theme: Theme;
  textSize: TextSize;
  highContrast: boolean;
  colorblind: boolean;
  dyslexiaFont: boolean;
  reducedMotion: boolean;

  // Gameplay personalization
  dominantArm: DominantArm;
  difficulty: Difficulty;
  /** 0.7 (most forgiving) .. 1.3 (most precise), 1 = standard. Combines with difficulty. */
  motionSensitivity: number;

  // Future
  language: Language;
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function prefersLight(): Theme {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

const DEFAULTS: Settings = {
  musicOn: true,
  sfxOn: true,
  musicVolume: 0.6,
  sfxVolume: 0.6,
  voiceGuidanceOn: false,
  voiceVolume: 0.8,
  captionsOn: true,

  theme: prefersLight(),
  textSize: 'md',
  highContrast: false,
  colorblind: false,
  dyslexiaFont: false,
  reducedMotion: prefersReducedMotion(),

  dominantArm: 'both',
  difficulty: 'standard',
  motionSensitivity: 1,

  language: 'en',
};

/**
 * A tiny observable settings store. Lives outside React so non-React game
 * scenes and services can read settings synchronously (every frame, in
 * ExerciseEngine tuning, etc.), while the UI subscribes through useSettings
 * (useSyncExternalStore).
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
