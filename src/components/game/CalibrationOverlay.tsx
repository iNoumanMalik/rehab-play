interface CalibrationOverlayProps {
  prompt: string;
  stepProgress: number; // 0..1
  capturing: boolean;
  tracked: boolean;
}

const R = 52;
const C = 2 * Math.PI * R;

/** Full-surface overlay guiding the user through ROM calibration before a game. */
export function CalibrationOverlay({ prompt, stepProgress, capturing, tracked }: CalibrationOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-black/55 backdrop-blur-sm text-center px-6"
      role="status" aria-live="polite">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={R} fill="none"
            stroke={capturing ? '#34d399' : '#a78bfa'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - stepProgress)}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          {capturing ? '🎯' : '🧍'}
        </div>
      </div>

      <div className="max-w-md">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300/80 mb-2">Calibrating your range</p>
        <p className="text-lg sm:text-xl font-bold text-white leading-snug">{prompt}</p>
        {!tracked && (
          <p className="text-amber-300 text-sm mt-3 font-medium animate-pulse">
            Move so your head, shoulders and hands are all visible.
          </p>
        )}
      </div>
    </div>
  );
}
