import { useEffect } from 'react';
import type { GameStats, GameId, Achievement } from '../../types';
import type { SessionRewardResult } from '../../core/services/ProgressionStore';
import { StatCard } from '../ui/StatCard';
import { voiceGuidance } from '../../core/services/VoiceGuidanceService';

interface VictoryScreenProps {
  gameId: GameId;
  won: boolean;
  stats: GameStats;
  reward: SessionRewardResult | null;
  achievements: Achievement[];
  onPlayAgain: () => void;
  onBack: () => void;
}

const STATS_CONFIG = [
  { key: 'score' as const, label: 'Score', gradient: 'from-yellow-500/20 to-amber-500/15', border: 'border-yellow-500/40', textColor: 'text-yellow-700 dark:text-yellow-200' },
  { key: 'accuracy' as const, label: 'Accuracy', suffix: '%', gradient: 'from-emerald-500/20 to-green-500/15', border: 'border-emerald-500/40', textColor: 'text-emerald-700 dark:text-emerald-200' },
  { key: 'successfulActions' as const, label: 'Targets', gradient: 'from-cyan-500/20 to-blue-500/15', border: 'border-cyan-500/40', textColor: 'text-cyan-700 dark:text-cyan-200' },
  { key: 'maxCombo' as const, label: 'Best Combo', suffix: 'x', gradient: 'from-purple-500/20 to-pink-500/15', border: 'border-purple-500/40', textColor: 'text-purple-700 dark:text-purple-200' },
];

/**
 * React overlay shown on the Stage when a session ends — replaces the old
 * canvas-drawn "Session Complete" text with a real, accessible recap: stats,
 * XP earned (with a level-up call-out), and any achievements unlocked.
 */
export function VictoryScreen({ won, stats, reward, achievements, onPlayAgain, onBack }: VictoryScreenProps) {
  const xpPct = reward ? Math.min(1, reward.xpIntoLevel / Math.max(1, reward.xpForNextLevel)) : 0;

  useEffect(() => {
    const headline = won
      ? `Victory! Final score ${stats.score}, ${stats.accuracy} percent accuracy.`
      : `Session complete. Final score ${stats.score}.`;
    voiceGuidance.speak(headline, { interrupt: true });
    // Announce once, when the recap first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-label={won ? 'Victory' : 'Session complete'}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-[var(--color-surface-strong)] border border-[var(--color-border-strong)] rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-[popIn_0.35s_ease-out]">
        <div className="text-5xl mb-2">{won ? '🏆' : '✅'}</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[var(--color-text)] via-[var(--color-text)]/90 to-[var(--color-text)]/70 bg-clip-text text-transparent mb-1">
          {won ? 'Victory!' : 'Session Complete'}
        </h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">
          {won ? "You've mastered this challenge." : 'Great work — every rep counts.'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {STATS_CONFIG.map(({ key, label, suffix, gradient, border, textColor }) => (
            <StatCard
              key={key}
              value={`${stats[key]}${suffix ?? ''}`}
              label={label}
              gradient={gradient}
              border={border}
              textColor={textColor}
            />
          ))}
        </div>

        {reward && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-2xl p-4 mb-5 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-violet-700 dark:text-violet-200">
                {reward.leveledUp ? `⬆️ Level ${reward.level}!` : `Level ${reward.level}`}
              </span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">+{reward.xpEarned} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-[width] duration-500" style={{ width: `${xpPct * 100}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-[var(--color-text-faint)]">
              <span>{reward.xpIntoLevel} / {reward.xpForNextLevel} XP to next level</span>
              {reward.streakDays > 0 && <span>🔥 {reward.streakDays}-day streak</span>}
            </div>
          </div>
        )}

        {achievements.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-faint)] mb-2 text-left">Achievements Unlocked</p>
            <div className="flex flex-wrap gap-2">
              {achievements.map(a => (
                <div key={a.id} className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full pl-1.5 pr-3 py-1">
                  <span className="text-base">{a.icon}</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-100">{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-[var(--color-text-faint)] font-semibold mb-4">✓ Progress saved</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onPlayAgain}
            className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-[var(--color-text)] font-extrabold rounded-2xl border border-violet-500/40 shadow-lg transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50"
          >
            🔁 Play Again
          </button>
          <button
            onClick={onBack}
            className="px-8 py-3.5 bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] font-bold rounded-2xl border border-[var(--color-border-strong)] transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
