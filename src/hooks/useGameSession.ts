import { useState, useCallback } from 'react';
import type { PoseData, GameStats, GameId } from '../types';
import { audioManager } from '../core/services/AudioManager';
import { analyticsService } from '../core/services/AnalyticsService';
import { achievementService } from '../core/services/AchievementService';

export interface GameEndPayload {
  score: number;
  level: number;
  maxCombo: number;
  accuracy: number;
  feedback: string[];
}

/** Callbacks a game component uses to report its state upward. */
export interface GameSessionHandlers {
  onScoreUpdate: (score: number) => void;
  onSuccessUpdate: (count: number) => void;
  onRepetitionsUpdate: (count: number) => void;
  onGameEnd: (data: GameEndPayload) => void;
  onFeedback: (messages: string[]) => void;
  onComboUpdate: (combo: number, multiplier: number) => void;
}

const INITIAL_STATS: GameStats = {
  score: 0, accuracy: 100, successfulActions: 0, repetitions: 0, maxCombo: 0, level: 1, duration: 0,
};

/**
 * Owns the live state for a single play session (score, feedback, combo,
 * game-over) plus the handlers the active game reports through. Kept separate
 * from layout so the game canvas (overlaid on the camera) and the stats panel
 * (below it) can share one source of truth without prop-drilling through the
 * persistent camera Stage.
 */
export function useGameSession(gameId: GameId | null, poseDataRef: React.RefObject<PoseData | null>) {
  void poseDataRef; // reserved for session-level analytics recording (Phase 1)
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  // Reset everything whenever we switch into a different game. Adjusting state
  // during render (React's documented "storing info from previous renders"
  // pattern) instead of an effect avoids a wasted render with stale stats.
  const [prevGameId, setPrevGameId] = useState(gameId);
  if (prevGameId !== gameId) {
    setPrevGameId(gameId);
    setStats(INITIAL_STATS);
    setFeedback([]);
    setCombo(0);
    setMultiplier(1);
    setGameOver(false);
  }

  const finalize = useCallback((data: GameEndPayload) => {
    setGameOver(true);
    setStats(prev => ({ ...prev, level: data.level, maxCombo: data.maxCombo, accuracy: data.accuracy }));

    const unlocked = achievementService.check({
      ...INITIAL_STATS,
      score: data.score,
      level: data.level,
      maxCombo: data.maxCombo,
      accuracy: data.accuracy,
    });
    if (unlocked.length > 0) {
      audioManager.playLevelUp();
      unlocked.forEach(a => console.log(`Achievement unlocked: ${a.title}`));
    }
  }, []);

  const handlers: GameSessionHandlers = {
    onScoreUpdate: useCallback((score: number) => setStats(prev => ({ ...prev, score })), []),
    onSuccessUpdate: useCallback((count: number) => setStats(prev => ({ ...prev, successfulActions: count })), []),
    onRepetitionsUpdate: useCallback((count: number) => setStats(prev => ({ ...prev, repetitions: count })), []),
    onGameEnd: finalize, // the game already saved its report via analyticsService
    onFeedback: useCallback((messages: string[]) => setFeedback(messages), []),
    onComboUpdate: useCallback((c: number, m: number) => { setCombo(c); setMultiplier(m); }, []),
  };

  /** Manual "End Session" — the game is still running, so we save the report here. */
  const endSession = useCallback(() => {
    if (!gameId || gameOver) return;
    const report = analyticsService.endSession(stats.score, stats.level, stats.maxCombo, stats.accuracy, feedback);
    finalize(report);
  }, [gameId, gameOver, stats, feedback, finalize]);

  return { stats, feedback, combo, multiplier, gameOver, handlers, endSession };
}
