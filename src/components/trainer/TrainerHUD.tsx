import { Button } from '../ui/primitives/Button';
import { formatClock } from '../../core/trainer/format';
import type { TrainerSession } from '../../core/trainer/useTrainerSession';
import { SEGMENT_SECONDS, type SessionDurationMinutes } from '../../core/trainer/types';

const DURATION_OPTIONS: SessionDurationMinutes[] = [1, 3, 5];

interface TrainerHUDProps {
  session: TrainerSession;
  onExit: () => void;
}

export function TrainerHUD({ session, onExit }: TrainerHUDProps) {
  const { status } = session;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col">
      <TopBar onExit={onExit} />

      {status === 'running' || status === 'paused' ? <ActiveHUD session={session} /> : null}
      {status === 'idle' && <StartOverlay onStart={session.start} />}
      {status === 'completed' && <CompletedOverlay session={session} />}
    </div>
  );
}

function TopBar({ onExit }: { onExit: () => void }) {
  return (
    <div className="pointer-events-auto flex items-center justify-between px-5 sm:px-8 pt-5 sm:pt-6">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-accent/90 flex items-center justify-center shadow-1 text-lg">🧘</span>
        <div>
          <div className="text-white font-extrabold text-base sm:text-lg leading-tight font-display">Guided Exercise</div>
          <div className="text-white/50 text-[11px] font-semibold uppercase tracking-widest">Live Trainer</div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onExit} aria-label="Exit guided exercise">
        ✕ Exit
      </Button>
    </div>
  );
}

function StartOverlay({ onStart }: { onStart: (minutes: SessionDurationMinutes) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 pointer-events-auto">
      <div className="bg-black/55 backdrop-blur-xl border border-white/15 rounded-3xl px-8 py-10 sm:px-12 sm:py-12 max-w-md w-full text-center shadow-2">
        <div className="text-4xl mb-4">🏋️</div>
        <h2 className="text-white text-2xl sm:text-3xl font-extrabold font-display mb-2">Ready when you are</h2>
        <p className="text-white/60 text-sm sm:text-base font-medium mb-8">
          Pick a session length. Your trainer will guide you through a rotation of exercises.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-2">
          {DURATION_OPTIONS.map(minutes => (
            <button
              key={minutes}
              onClick={() => onStart(minutes)}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-white/10 hover:bg-accent/80 border border-white/15 hover:border-accent transition-all duration-200 text-white cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
            >
              <span className="text-2xl font-extrabold font-display">{minutes}</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-white/70">min</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompletedOverlay({ session }: { session: TrainerSession }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 pointer-events-auto">
      <div className="bg-black/55 backdrop-blur-xl border border-white/15 rounded-3xl px-8 py-10 sm:px-12 sm:py-12 max-w-md w-full text-center shadow-2">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-white text-2xl sm:text-3xl font-extrabold font-display mb-2">Session complete</h2>
        <p className="text-white/60 text-sm sm:text-base font-medium mb-8">
          You finished {session.completedCount} exercise{session.completedCount === 1 ? '' : 's'} in {session.durationMinutes} minute
          {session.durationMinutes === 1 ? '' : 's'}. Nice work.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DURATION_OPTIONS.map(minutes => (
            <button
              key={minutes}
              onClick={() => session.start(minutes)}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-white/10 hover:bg-accent/80 border border-white/15 hover:border-accent transition-all duration-200 text-white cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
            >
              <span className="text-2xl font-extrabold font-display">{minutes}</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-white/70">min</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActiveHUD({ session }: { session: TrainerSession }) {
  const { totalRemainingSeconds, currentClip, nextClip, segmentIndex, segmentCount, completedCount, status } = session;
  const segmentProgress = 1 - session.segmentRemainingSeconds / SEGMENT_SECONDS;
  const overallProgress = segmentCount > 0 ? (segmentIndex + segmentProgress) / segmentCount : 0;

  return (
    <>
      {/* Current / upcoming exercise + countdown */}
      <div className="pointer-events-none flex items-start justify-between px-5 sm:px-8 mt-4 sm:mt-6 gap-4">
        <div className="bg-black/45 backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-3.5 shadow-1">
          <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">
            Exercise {segmentIndex + 1} of {segmentCount}
          </div>
          <div className="text-white text-lg sm:text-xl font-extrabold font-display leading-tight">{currentClip.name}</div>
          {nextClip && (
            <div className="text-white/45 text-xs font-semibold mt-1">
              Next: <span className="text-white/70">{nextClip.name}</span>
            </div>
          )}
        </div>

        <div className="bg-black/45 backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-3.5 shadow-1 text-center min-w-[92px]">
          <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Time Left</div>
          <div className="text-white text-2xl font-extrabold font-display tabular-nums">{formatClock(totalRemainingSeconds)}</div>
          {status === 'paused' && <div className="text-warning text-[11px] font-bold mt-0.5">Paused</div>}
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="mt-auto pointer-events-auto px-5 sm:px-8 pb-6 sm:pb-8">
        <div className="bg-black/45 backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 shadow-1 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, overallProgress * 100)}%` }}
              />
            </div>
            <span className="text-white/60 text-xs font-bold tabular-nums whitespace-nowrap">
              ✓ {completedCount} completed
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="w-24 h-1 rounded-full bg-white/10 overflow-hidden sm:hidden" aria-hidden="true">
              <div className="h-full bg-white/40 rounded-full" style={{ width: `${Math.min(100, segmentProgress * 100)}%` }} />
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              {status === 'running' ? (
                <Button variant="secondary" size="md" onClick={session.pause}>
                  ⏸ Pause
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={session.resume}>
                  ▶ Resume
                </Button>
              )}
              <Button variant="secondary" size="md" onClick={session.skip}>
                {session.nextClip ? '⏭ Skip' : '⏭ Finish'}
              </Button>
              <Button variant="danger" size="md" onClick={session.stop}>
                ⏹ Stop
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
