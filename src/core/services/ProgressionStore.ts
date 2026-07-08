import { StorageService } from './StorageService';

export const DAILY_GOAL_TARGET = 3;

interface ProgressionState {
  xp: number;
  streakDays: number;
  lastPlayedDate: string; // 'YYYY-MM-DD', '' if never played
  dailyGoalDate: string;
  dailyGoalCount: number;
}

export interface SessionRewardResult {
  xpEarned: number;
  totalXp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streakDays: number;
  streakExtended: boolean;
  dailyGoalCount: number;
  dailyGoalTarget: number;
  dailyGoalCompletedNow: boolean;
}

export interface ProgressionSnapshot {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streakDays: number;
  dailyGoalCount: number;
  dailyGoalTarget: number;
}

const DEFAULTS: ProgressionState = {
  xp: 0, streakDays: 0, lastPlayedDate: '', dailyGoalDate: '', dailyGoalCount: 0,
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayKey(): string { return dateKey(new Date()); }
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

/** XP cost to advance FROM `level` to `level + 1`. */
function xpCostForLevel(level: number): number {
  return level * 100;
}

/** Cumulative xp -> {level, xp progress into that level, xp span of that level}. */
function levelFromXp(xp: number): { level: number; into: number; span: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpCostForLevel(level)) {
    remaining -= xpCostForLevel(level);
    level++;
  }
  return { level, into: remaining, span: xpCostForLevel(level) };
}

/**
 * Reactive singleton tracking the player's XP/level, day streak, and daily
 * session goal — the "reasons to come back tomorrow" layer. Lives outside
 * React (like SettingsStore) so it can be updated from plain game-end logic
 * and read reactively via useProgression.
 */
class ProgressionStore {
  private state: ProgressionState;
  private listeners = new Set<() => void>();
  // useSyncExternalStore requires a stable reference when nothing changed, so
  // we cache the derived snapshot and only recompute when the state (or the
  // day, since the daily goal resets at midnight) actually changes.
  private cachedSnapshot: ProgressionSnapshot | null = null;
  private cachedForState: ProgressionState | null = null;
  private cachedDay = '';

  constructor() {
    this.state = { ...DEFAULTS, ...StorageService.get<Partial<ProgressionState>>('progression', {}) };
  }

  get = (): ProgressionState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  snapshot(): ProgressionSnapshot {
    const today = todayKey();
    if (this.cachedSnapshot && this.cachedForState === this.state && this.cachedDay === today) {
      return this.cachedSnapshot;
    }
    const info = levelFromXp(this.state.xp);
    this.cachedSnapshot = {
      xp: this.state.xp,
      level: info.level,
      xpIntoLevel: info.into,
      xpForNextLevel: info.span,
      streakDays: this.state.streakDays,
      dailyGoalCount: this.state.dailyGoalDate === today ? this.state.dailyGoalCount : 0,
      dailyGoalTarget: DAILY_GOAL_TARGET,
    };
    this.cachedForState = this.state;
    this.cachedDay = today;
    return this.cachedSnapshot;
  }

  /** Call once per completed session. Awards xp, updates streak + daily goal. */
  recordSession(xpEarned: number): SessionRewardResult {
    const today = todayKey();
    const before = levelFromXp(this.state.xp);

    let streakDays = this.state.streakDays;
    let streakExtended = false;
    if (this.state.lastPlayedDate !== today) {
      if (this.state.lastPlayedDate === yesterdayKey()) {
        streakDays += 1;
        streakExtended = true;
      } else {
        streakDays = 1;
      }
    }

    const goalCountToday = this.state.dailyGoalDate === today ? this.state.dailyGoalCount : 0;
    const wasGoalMet = goalCountToday >= DAILY_GOAL_TARGET;
    const dailyGoalCount = goalCountToday + 1;
    const dailyGoalCompletedNow = !wasGoalMet && dailyGoalCount >= DAILY_GOAL_TARGET;

    const totalXp = this.state.xp + xpEarned;
    const after = levelFromXp(totalXp);

    this.state = { xp: totalXp, streakDays, lastPlayedDate: today, dailyGoalDate: today, dailyGoalCount };
    StorageService.set('progression', this.state);
    this.listeners.forEach(l => l());

    return {
      xpEarned, totalXp,
      level: after.level, previousLevel: before.level, leveledUp: after.level > before.level,
      xpIntoLevel: after.into, xpForNextLevel: after.span,
      streakDays, streakExtended,
      dailyGoalCount, dailyGoalTarget: DAILY_GOAL_TARGET, dailyGoalCompletedNow,
    };
  }
}

export const progressionStore = new ProgressionStore();
