import { useParams, useOutletContext } from 'react-router-dom';
import type { GameStats } from '../types';
import type { Tone } from '../types/theme';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/primitives/Button';
import type { AppOutletContext } from '../App';

const STAT_CARDS_CONFIG: { key: keyof GameStats; label: string; suffix?: string; tone: Tone }[] = [
  { key: 'score', label: 'Score', tone: 'accent' },
  { key: 'accuracy', label: 'Accuracy', suffix: '%', tone: 'success' },
  { key: 'successfulActions', label: 'Targets', tone: 'warning' },
  { key: 'repetitions', label: 'Reps', tone: 'neutral' },
];

const INSTRUCTIONS: Record<string, string> = {
  'butterfly-rescue': 'Move your hands over butterflies to catch them. Avoid the brown moths!',
  'fruit-harvest': 'Reach up high and down low to collect recipe fruits. Watch out for wrong fruits!',
  'crystal-guardian': 'Raise both arms overhead to charge the crystal. Release to blast enemies!',
  'fruit-slice': 'Swipe your arm through the fruit with a real reach — avoid slicing the bombs!',
  'wall-painter': 'Reach a paint well to load color, then carry it to a canvas and hold to mix it toward the target shown above each one.',
  'tilt-maze': 'Lean left or right to dodge walls — the ball rolls toward the flag on its own. Lean forward to speed up!',
};

/**
 * The stats + controls panel shown below the camera Stage during a session.
 * All live state lives in App's useGameSession (reached via the router Outlet
 * context); this component is presentational.
 */
export function PlayChrome() {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const { session, backToDashboard } = useOutletContext<AppOutletContext>();
  const { stats, gameOver, endSession } = session;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="text-center bg-surface border border-border rounded-card p-3 sm:p-4">
        <p className="text-muted text-xs sm:text-sm font-medium">
          💡 {INSTRUCTIONS[gameId] ?? 'Move your body to interact with the game. Follow the on-screen feedback for best results.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STAT_CARDS_CONFIG.map(({ key, label, suffix, tone }) => (
          <StatCard
            key={key}
            id={`stat-${key}`}
            value={key === 'accuracy' ? `${stats[key]}${suffix}` : stats[key]}
            label={label}
            tone={tone}
          />
        ))}
      </div>

      <div className="flex justify-center gap-4">
        {gameOver ? (
          <Button variant="primary" size="lg" onClick={backToDashboard}>
            Back to Dashboard
          </Button>
        ) : (
          <Button variant="danger" size="lg" onClick={endSession}>
            End Session
          </Button>
        )}
      </div>
    </div>
  );
}
