import { useEffect, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import type { GameStats } from '../types';
import type { Tone } from '../types/theme';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/primitives/Button';
import { getGameMeta } from '../games/gameRegistry';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { AppOutletContext } from '../App';

const STAT_CARDS_CONFIG: { key: keyof GameStats; label: string; suffix?: string; tone: Tone }[] = [
  { key: 'score', label: 'Score', tone: 'accent' },
  { key: 'accuracy', label: 'Accuracy', suffix: '%', tone: 'success' },
  { key: 'successfulActions', label: 'Targets', tone: 'warning' },
  { key: 'repetitions', label: 'Reps', tone: 'neutral' },
];

/**
 * The stats + controls panel shown below the camera Stage during a session.
 * All live state lives in App's useGameSession (reached via the router Outlet
 * context); this component is presentational. Its content sits behind the
 * fullscreen Stage during actual play (see Stage.tsx) — the sr-only heading
 * below exists so screen-reader/keyboard users still get an announcement of
 * which session started, even though nothing here is visible during play.
 */
export function PlayChrome() {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const { session, backToDashboard } = useOutletContext<AppOutletContext>();
  const { stats, gameOver, endSession } = session;
  const meta = getGameMeta(gameId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useDocumentTitle(meta ? `RehabPlay — ${meta.title}` : 'RehabPlay — Session');
  useEffect(() => { headingRef.current?.focus(); }, [gameId]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h1 ref={headingRef} tabIndex={-1} className="sr-only outline-none">
        Playing {meta?.title ?? 'session'}
      </h1>

      <div className="text-center bg-surface border border-border rounded-card p-3 sm:p-4">
        <p className="text-muted text-xs sm:text-sm font-medium">
          💡 {meta?.instructions ?? 'Move your body to interact with the game. Follow the on-screen feedback for best results.'}
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
