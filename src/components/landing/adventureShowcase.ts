import type { GameId, SessionReport } from '../../types';

export type Difficulty = 'Gentle' | 'Standard' | 'Challenging';

export interface AdventureShowcaseMeta {
  difficulty: Difficulty;
  estMinutes: string;
  muscleGroups: string[];
  /** Player level required to unlock. Most sit at 1 (playable immediately) —
   * a handful unlock as the player levels up, so the carousel's "unlock
   * status" reflects real, growing progression data instead of a fake gate. */
  unlockLevel: number;
}

export const ADVENTURE_SHOWCASE: Record<GameId, AdventureShowcaseMeta> = {
  'butterfly-rescue': { difficulty: 'Gentle', estMinutes: '5–8 min', muscleGroups: ['Shoulders', 'Upper back'], unlockLevel: 1 },
  'fruit-harvest': { difficulty: 'Standard', estMinutes: '6–9 min', muscleGroups: ['Shoulders', 'Obliques'], unlockLevel: 1 },
  'crystal-guardian': { difficulty: 'Challenging', estMinutes: '8–12 min', muscleGroups: ['Deltoids', 'Core'], unlockLevel: 1 },
  'fruit-slice': { difficulty: 'Standard', estMinutes: '5–8 min', muscleGroups: ['Shoulders', 'Forearms'], unlockLevel: 1 },
  'wall-painter': { difficulty: 'Gentle', estMinutes: '6–10 min', muscleGroups: ['Shoulders', 'Arms'], unlockLevel: 2 },
  'tilt-maze': { difficulty: 'Standard', estMinutes: '4–7 min', muscleGroups: ['Core', 'Obliques'], unlockLevel: 2 },
  'cosmic-defender': { difficulty: 'Challenging', estMinutes: '10–15 min', muscleGroups: ['Full body', 'Neck'], unlockLevel: 3 },
};

export const DIFFICULTY_TONE: Record<Difficulty, 'success' | 'warning' | 'danger'> = {
  Gentle: 'success',
  Standard: 'warning',
  Challenging: 'danger',
};

export function sessionCountFor(gameId: string, history: SessionReport[]): number {
  return history.reduce((n, h) => (h.gameId === gameId ? n + 1 : n), 0);
}

/** A soft, ever-climbing "mastery" readout — not a strict pass/fail metric, just a sense of momentum. */
export function masteryPercent(sessions: number): number {
  return Math.min(100, sessions * 20);
}
