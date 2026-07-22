import type { JointAngles, MovementData } from './pose';
import type { Tone } from './theme';

export type GameId =
  | 'butterfly-rescue' | 'fruit-harvest' | 'crystal-guardian' | 'cosmic-defender'
  | 'fruit-slice' | 'wall-painter' | 'tilt-maze';

export interface GameMeta {
  id: GameId;
  title: string;
  description: string;
  tag: string;
  icon: string;
  rehabFocus: string;
  /** A single restrained accent tone for this card's tag badge — cards share one calm chrome, not a rainbow of gradients. */
  tone: Tone;
  /** Plain-language "how to play" — the single source of truth surfaced both
   * on the pre-game stats panel (PlayChrome) and the in-session Help overlay,
   * so a returning player can recall correct form without redoing onboarding. */
  instructions: string;
}

export interface GameStats {
  score: number;
  accuracy: number;
  successfulActions: number;
  repetitions: number;
  maxCombo: number;
  level: number;
  duration: number;
}

export interface GameState {
  phase: 'menu' | 'playing' | 'paused' | 'level-complete' | 'game-over' | 'victory';
  score: number;
  health: number;
  maxHealth: number;
  level: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  elapsed: number;
  stats: GameStats;
}

export interface LevelConfig {
  level: number;
  name: string;
  spawnRate: number;
  speedMultiplier: number;
  entityLimit: number;
  requiredScore: number;
  timeLimit: number;
  hasBoss: boolean;
  description: string;
}

export interface SessionReport {
  gameId: GameId;
  date: string;
  duration: number;
  score: number;
  level: number;
  maxCombo: number;
  accuracy: number;
  avgAngles: Partial<JointAngles>;
  avgMovement: Partial<MovementData>;
  feedback: string[];
}

export interface AchievementContext {
  totalSessions: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: GameStats, ctx: AchievementContext) => boolean;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface PlayerProfile {
  xp: number;
  level: number;
  totalSessions: number;
  totalScore: number;
  streakDays: number;
  lastPlayed: string;
  achievements: string[];
  gameHistory: SessionReport[];
}
