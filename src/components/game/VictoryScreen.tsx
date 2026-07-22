import { useEffect } from 'react';
import type { GameStats, GameId, Achievement } from '../../types';
import type { Tone } from '../../types/theme';
import type { SessionRewardResult } from '../../core/services/ProgressionStore';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/primitives/Button';
import { Badge } from '../ui/primitives/Badge';
import { voiceGuidance } from '../../core/services/VoiceGuidanceService';

interface VictoryScreenProps {
  gameId: GameId;
  outcome: 'won' | 'lost' | 'timeup' | 'quit';
  stats: GameStats;
  reward: SessionRewardResult | null;
  achievements: Achievement[];
  onPlayAgain: () => void;
  onBack: () => void;
}

const OUTCOME_COPY: Record<VictoryScreenProps['outcome'], { emoji: string; headline: string; subcopy: string; announce: string }> = {
  won: { emoji: '🏆', headline: 'Victory!', subcopy: "You've mastered this challenge.", announce: 'Victory!' },
  lost: { emoji: '💥', headline: 'Mission Failed', subcopy: "Don't worry — every attempt still builds strength. Try again!", announce: 'Mission failed.' },
  timeup: { emoji: '⏱️', headline: "Time's Up!", subcopy: 'Your session has been saved — nice work.', announce: "Time's up." },
  quit: { emoji: '✅', headline: 'Session Complete', subcopy: 'Great work — every rep counts.', announce: 'Session complete.' },
};

const STATS_CONFIG: { key: keyof GameStats; label: string; suffix?: string; tone: Tone }[] = [
  { key: 'score', label: 'Score', tone: 'accent' },
  { key: 'accuracy', label: 'Accuracy', suffix: '%', tone: 'success' },
  { key: 'successfulActions', label: 'Targets', tone: 'warning' },
  { key: 'maxCombo', label: 'Best Combo', suffix: 'x', tone: 'neutral' },
];

/**
 * React overlay shown on the Stage when a session ends — replaces the old
 * canvas-drawn "Session Complete" text with a real, accessible recap: stats,
 * XP earned (with a level-up call-out), and any achievements unlocked.
 */
export function VictoryScreen({ outcome, stats, reward, achievements, onPlayAgain, onBack }: VictoryScreenProps) {
  const xpPct = reward ? Math.min(1, reward.xpIntoLevel / Math.max(1, reward.xpForNextLevel)) : 0;
  const copy = OUTCOME_COPY[outcome];

  useEffect(() => {
    voiceGuidance.speak(`${copy.announce} Final score ${stats.score}, ${stats.accuracy} percent accuracy.`, { interrupt: true });
    // Announce once, when the recap first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-label={copy.headline}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-surface-strong border border-border-strong rounded-card shadow-3 p-6 sm:p-8 text-center animate-[popIn_0.35s_ease-out]">
        <div className="text-5xl mb-2">{copy.emoji}</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text font-display mb-1">
          {copy.headline}
        </h2>
        <p className="text-muted text-sm mb-6">
          {copy.subcopy}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {STATS_CONFIG.map(({ key, label, suffix, tone }) => (
            <StatCard
              key={key}
              value={`${stats[key]}${suffix ?? ''}`}
              label={label}
              tone={tone}
            />
          ))}
        </div>

        {reward && (
          <div className="bg-surface border border-border-strong rounded-card p-4 mb-5 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-accent-text">
                {reward.leveledUp ? `⬆️ Level ${reward.level}!` : `Level ${reward.level}`}
              </span>
              <span className="text-sm font-bold text-success-text">+{reward.xpEarned} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${xpPct * 100}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-faint">
              <span>{reward.xpIntoLevel} / {reward.xpForNextLevel} XP to next level</span>
              {reward.streakDays > 0 && <span>🔥 {reward.streakDays}-day streak</span>}
            </div>
          </div>
        )}

        {achievements.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faint mb-2 text-left">Achievements Unlocked</p>
            <div className="flex flex-wrap gap-2">
              {achievements.map(a => (
                <Badge key={a.id} tone="warning" className="pl-1.5 pr-3 py-1">
                  <span className="text-base">{a.icon}</span>
                  <span>{a.title}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-faint font-semibold mb-4">✓ Progress saved</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" size="lg" onClick={onPlayAgain}>
            🔁 Play Again
          </Button>
          <Button variant="secondary" size="lg" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
