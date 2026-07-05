import type { JointAngles, MovementData } from './pose';

export type GameId = 'butterfly-rescue' | 'fruit-harvest' | 'crystal-guardian';

export interface GameMeta {
  id: GameId;
  title: string;
  description: string;
  tag: string;
  icon: string;
  rehabFocus: string;
  gradient: string;
  border: string;
  tagColor: string;
  hoverGlow: string;
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

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: GameStats) => boolean;
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
