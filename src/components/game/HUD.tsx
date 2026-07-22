import { useEffect, useRef, useState } from 'react';
import { safe, danger } from '../../core/engine/palette';
import { Button } from '../ui/primitives/Button';

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

  // Announce the low-time state to screen readers exactly once on the
  // transition into it — a per-second aria-live update would be unusably
  // noisy, but silently relying on the color swap alone leaves screen-reader
  // users with no signal at all (WCAG 1.4.1, Use of Color).
  const [timeAnnouncement, setTimeAnnouncement] = useState('');
  const announcedLowTime = useRef(false);
  useEffect(() => {
    if (lowTime && !announcedLowTime.current) {
      announcedLowTime.current = true;
      setTimeAnnouncement(`${remainingSec} seconds remaining`);
    } else if (!lowTime) {
      announcedLowTime.current = false;
    }
  }, [lowTime, remainingSec]);

  return (
    <div className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-b from-black/70 via-black/45 to-transparent">
      <Button variant="ghost" size="icon" onClick={onTogglePause} aria-label={paused ? 'Resume' : 'Pause'} className="flex-shrink-0">
        <span aria-hidden="true">{paused ? '▶' : '⏸'}</span>
      </Button>

      <div className="flex-shrink-0 text-white font-extrabold text-sm sm:text-base tabular-nums">
        Score {score}
      </div>

      {health && (
        <div
          className="flex-shrink-0 flex items-center gap-1.5"
          role="progressbar"
          aria-label="Health"
          aria-valuenow={health.current}
          aria-valuemin={0}
          aria-valuemax={health.max}
          aria-valuetext={`${health.current} of ${health.max}`}
        >
          <span aria-hidden="true" className="text-xs">❤️</span>
          <div className="w-12 sm:w-20 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${healthPct * 100}%`, backgroundColor: healthPct > 0.4 ? safe() : danger() }}
            />
          </div>
          <span className="text-white/70 text-[11px] font-bold tabular-nums">{health.current}/{health.max}</span>
        </div>
      )}

      <div className="flex-1" />

      <div className={`flex-shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-bold tabular-nums ${lowTime ? 'text-on-dark-danger' : 'text-white'}`}>
        <span aria-hidden="true">⏱</span> {formatTime(remainingSec ?? elapsedSec)}
      </div>
      <span className="sr-only" role="status" aria-live="polite">{timeAnnouncement}</span>
    </div>
  );
}
