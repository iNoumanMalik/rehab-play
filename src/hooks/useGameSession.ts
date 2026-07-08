import { useState, useCallback } from 'react';
import type { PoseData, GameStats, Achievement } from '../types';
import { audioManager } from '../core/services/AudioManager';
import { analyticsService } from '../core/services/AnalyticsService';
import { achievementService } from '../core/services/AchievementService';
import { progressionStore, type SessionRewardResult } from '../core/services/ProgressionStore';
import { toastStore } from '../core/services/ToastStore';

export interface GameEndPayload {
  score: number;
  level: number;
  maxCombo: number;
  accuracy: number;
  feedback: string[];
  won: boolean;
  successfulActions: number;
  repetitions: number;
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

/** XP earned for a session — transparent, and every session earns something. */
function computeSessionXp(stats: GameStats, won: boolean): number {
  const base = Math.round(stats.score / 8);
  const repBonus = stats.repetitions * 4;
  const catchBonus = stats.successfulActions * 2;
  const accuracyBonus = stats.accuracy >= 95 ? 25 : stats.accuracy >= 80 ? 10 : 0;
  const victoryBonus = won ? 60 : 0;
  return Math.max(5, base + repBonus + catchBonus + accuracyBonus + victoryBonus);
}

/**
 * Owns the live state for a single play session (score, feedback, combo,
 * game-over, and the end-of-session reward: XP/level/streak/achievements)
 * plus the handlers the active game reports through. Kept separate from
 * layout so the game canvas (overlaid on the camera) and the stats panel
 * (below it) can share one source of truth without prop-drilling through the
 * persistent camera Stage.
 *
 * `sessionKey` should change whenever a *new* play session starts (switching
 * games, or replaying the same game) so state resets correctly.
 */
export function useGameSession(sessionKey: string | null, poseDataRef: React.RefObject<PoseData | null>) {
  void poseDataRef; // reserved for session-level analytics recording (Phase 1)
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [reward, setReward] = useState<SessionRewardResult | null>(null);
  const [achievementsEarned, setAchievementsEarned] = useState<Achievement[]>([]);

  // Reset everything whenever a new session starts. Adjusting state during
  // render (React's documented "storing info from previous renders" pattern)
  // instead of an effect avoids a wasted render with stale stats.
  const [prevKey, setPrevKey] = useState(sessionKey);
  if (prevKey !== sessionKey) {
    setPrevKey(sessionKey);
    setStats(INITIAL_STATS);
    setFeedback([]);
    setCombo(0);
    setMultiplier(1);
    setGameOver(false);
    setWon(false);
    setReward(null);
    setAchievementsEarned([]);
  }

  const finalize = useCallback((data: GameEndPayload) => {
    setGameOver(true);
    setWon(data.won);
    setStats(prev => ({
      ...prev,
      score: data.score, level: data.level, maxCombo: data.maxCombo, accuracy: data.accuracy,
      successfulActions: data.successfulActions, repetitions: data.repetitions,
    }));

    const fullStats: GameStats = {
      score: data.score, accuracy: data.accuracy, successfulActions: data.successfulActions,
      repetitions: data.repetitions, maxCombo: data.maxCombo, level: data.level, duration: 0,
    };

    const unlocked = achievementService.check(fullStats, { totalSessions: analyticsService.getTotalSessions() });
    const xpEarned = computeSessionXp(fullStats, data.won);
    const result = progressionStore.recordSession(xpEarned);

    setReward(result);
    setAchievementsEarned(unlocked);

    if (result.leveledUp || unlocked.length > 0 || result.dailyGoalCompletedNow) {
      audioManager.playLevelUp();
    }
    if (result.leveledUp) {
      toastStore.push({ kind: 'levelup', icon: '⬆️', title: `Level ${result.level}!`, description: 'Your training is paying off.' });
    }
    if (result.streakExtended) {
      toastStore.push({ kind: 'streak', icon: '🔥', title: `${result.streakDays}-day streak!`, description: 'Come back tomorrow to keep it alive.' });
    }
    if (result.dailyGoalCompletedNow) {
      toastStore.push({ kind: 'goal', icon: '🎯', title: 'Daily goal complete!', description: `${result.dailyGoalTarget} sessions today — nice work.` });
    }
    unlocked.forEach(a => {
      toastStore.push({ kind: 'achievement', icon: a.icon, title: a.title, description: a.description });
    });
  }, []);

  const handlers: GameSessionHandlers = {
    onScoreUpdate: useCallback((score: number) => setStats(prev => ({ ...prev, score })), []),
    onSuccessUpdate: useCallback((count: number) => setStats(prev => ({ ...prev, successfulActions: count })), []),
    onRepetitionsUpdate: useCallback((count: number) => setStats(prev => ({ ...prev, repetitions: count })), []),
    onGameEnd: finalize, // the game already saved its report via analyticsService
    onFeedback: useCallback((messages: string[]) => setFeedback(messages), []),
    onComboUpdate: useCallback((c: number, m: number) => { setCombo(c); setMultiplier(m); }, []),
  };

  /** Manual "End Session" / pause-menu quit — the game is still running, so we save the report here. */
  const endSession = useCallback(() => {
    if (!sessionKey || gameOver) return;
    const report = analyticsService.endSession(stats.score, stats.level, stats.maxCombo, stats.accuracy, feedback);
    finalize({
      score: report.score, level: report.level, maxCombo: report.maxCombo, accuracy: report.accuracy,
      feedback: report.feedback, won: false,
      successfulActions: stats.successfulActions, repetitions: stats.repetitions,
    });
  }, [sessionKey, gameOver, stats, feedback, finalize]);

  return { stats, feedback, combo, multiplier, gameOver, won, reward, achievementsEarned, handlers, endSession };
}
