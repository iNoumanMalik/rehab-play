import { safe, danger } from '../../core/engine/palette';

interface HUDProps {
  score: number;
  elapsedSec: number;
  /** When set, the timer counts down from this and the session auto-ends at 0. */
  durationSec: number | null;
  health: { current: number; max: number } | null;
  paused: boolean;
  onTogglePause: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * One unified top HUD bar — pause, score, health (if the game has one), and
 * the session timer all in a single flush-at-the-top strip. Previously these
 * were separate floating pills sitting below a gap, with each game ALSO
 * drawing its own duplicate score/hearts on canvas — now this is the single
 * source of truth and games no longer draw score/hearts themselves.
 */
export function HUD({ score, elapsedSec, durationSec, health, paused, onTogglePause }: HUDProps) {
  const healthPct = health ? Math.max(0, Math.min(1, health.current / health.max)) : 0;
  const remainingSec = durationSec != null ? Math.max(0, durationSec - elapsedSec) : null;
  const lowTime = remainingSec != null && remainingSec <= 10;

  return (
    <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-b from-black/70 via-black/45 to-transparent">
      <button
        onClick={onTogglePause}
        aria-label={paused ? 'Resume' : 'Pause'}
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
      >
        {paused ? '▶' : '⏸'}
      </button>

      <div className="flex-shrink-0 text-white font-extrabold text-sm sm:text-base tabular-nums">
        Score {score}
      </div>

      {health && (
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className="text-xs">❤️</span>
          <div className="w-12 sm:w-20 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${healthPct * 100}%`, backgroundColor: healthPct > 0.4 ? safe() : danger() }}
            />
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className={`flex-shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-bold tabular-nums ${lowTime ? 'text-on-dark-danger' : 'text-white'}`}>
        ⏱ {formatTime(remainingSec ?? elapsedSec)}
      </div>
    </div>
  );
}
