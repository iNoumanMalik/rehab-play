import type { GameStats, GameId } from '../types';
import { StatCard } from '../components/ui/StatCard';

interface GameSessionProps {
  gameId: GameId;
  stats: GameStats;
  gameOver: boolean;
  onEndSession: () => void;
  onBack: () => void;
}

const STAT_CARDS_CONFIG = [
  { key: 'score' as const, label: 'Score', gradient: 'from-yellow-500/20 to-amber-500/15', border: 'border-yellow-500/40', textColor: 'text-yellow-700 dark:text-yellow-200' },
  { key: 'accuracy' as const, label: 'Accuracy', suffix: '%', gradient: 'from-emerald-500/20 to-green-500/15', border: 'border-emerald-500/40', textColor: 'text-emerald-700 dark:text-emerald-200' },
  { key: 'successfulActions' as const, label: 'Targets', gradient: 'from-cyan-500/20 to-blue-500/15', border: 'border-cyan-500/40', textColor: 'text-cyan-700 dark:text-cyan-200' },
  { key: 'repetitions' as const, label: 'Reps', gradient: 'from-purple-500/20 to-pink-500/15', border: 'border-purple-500/40', textColor: 'text-purple-700 dark:text-purple-200' },
];

const INSTRUCTIONS: Record<string, string> = {
  'butterfly-rescue': 'Move your hands over butterflies to catch them. Avoid the brown moths!',
  'fruit-harvest': 'Reach up high and down low to collect recipe fruits. Watch out for wrong fruits!',
  'crystal-guardian': 'Raise both arms overhead to charge the crystal. Release to blast enemies!',
};

/**
 * The stats + controls panel shown below the camera Stage during a session.
 * All live state lives in useGameSession; this component is presentational.
 */
export function GameSession({ gameId, stats, gameOver, onEndSession, onBack }: GameSessionProps) {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="text-center bg-[var(--color-surface)] border border-[var(--color-border)] backdrop-blur-lg rounded-2xl p-3 sm:p-4">
        <p className="text-[var(--color-text-muted)] text-xs sm:text-sm font-medium">
          💡 {INSTRUCTIONS[gameId] ?? 'Move your body to interact with the game. Follow the on-screen feedback for best results.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STAT_CARDS_CONFIG.map(({ key, label, suffix, gradient, border, textColor }) => (
          <StatCard
            key={key}
            id={`stat-${key}`}
            value={key === 'accuracy' ? `${stats[key]}${suffix}` : stats[key]}
            label={label}
            gradient={gradient}
            border={border}
            textColor={textColor}
          />
        ))}
      </div>

      <div className="flex justify-center gap-4">
        {gameOver ? (
          <button
            onClick={onBack}
            className="px-10 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-[var(--color-text)] font-extrabold text-base sm:text-lg rounded-2xl transition-all duration-300 border border-violet-500/40 shadow-lg hover:shadow-violet-500/25 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50"
          >
            Back to Dashboard
          </button>
        ) : (
          <button
            onClick={onEndSession}
            className="group relative px-10 py-4 bg-[var(--color-surface-strong)] hover:bg-rose-500/10 text-[var(--color-text)] hover:text-rose-700 dark:hover:text-rose-200 font-extrabold text-base sm:text-lg rounded-2xl transition-all duration-300 border border-[var(--color-border-strong)] hover:border-rose-500/30 overflow-hidden shadow-lg shadow-black/20 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-rose-500/50"
          >
            <span className="relative z-10 flex items-center gap-2.5">
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              End Session
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
