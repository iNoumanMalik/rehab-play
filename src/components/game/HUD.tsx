import { safe, danger } from '../../core/engine/palette';

interface HUDProps {
  elapsedSec: number;
  health: { current: number; max: number } | null;
  paused: boolean;
  onTogglePause: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Top HUD strip overlaid on the game canvas: pause control, session timer, and (if the game has one) a health bar. */
export function HUD({ elapsedSec, health, paused, onTogglePause }: HUDProps) {
  const healthPct = health ? Math.max(0, Math.min(1, health.current / health.max)) : 0;

  return (
    <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
      <button
        onClick={onTogglePause}
        aria-label={paused ? 'Resume' : 'Pause'}
        className="pointer-events-auto flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-[var(--color-text)] text-base backdrop-blur-md transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        {paused ? '▶' : '⏸'}
      </button>

      <div className="pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-white/20 backdrop-blur-md text-[var(--color-text)] text-xs sm:text-sm font-bold tabular-nums">
        ⏱ {formatTime(elapsedSec)}
      </div>

      {health ? (
        <div className="pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/20 backdrop-blur-md">
          <span className="text-xs">❤️</span>
          <div className="w-16 sm:w-24 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${healthPct * 100}%`, backgroundColor: healthPct > 0.4 ? safe() : danger() }}
            />
          </div>
        </div>
      ) : (
        <div className="w-9 sm:w-10" aria-hidden="true" />
      )}
    </div>
  );
}
