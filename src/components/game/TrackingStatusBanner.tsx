import type { TrackingHealth } from '../../hooks/useTrackingHealth';

interface TrackingStatusBannerProps {
  health: TrackingHealth;
}

const MESSAGES: { test: (h: TrackingHealth) => boolean; icon: string; text: string }[] = [
  { test: h => h.distance === 'too-close', icon: '↔️', text: 'Step back a little so your whole upper body is in view' },
  { test: h => h.distance === 'too-far', icon: '↔️', text: 'Move a bit closer to the camera' },
  { test: h => h.lighting === 'low', icon: '💡', text: 'It looks dark — try moving to a brighter spot' },
];

/**
 * Non-blocking, self-dismissing guidance shown BEFORE tracking breaks down —
 * error prevention rather than only an error message after the fact. Distinct
 * from Stage's hard error state (camera denied / model failed): this is
 * advisory and never covers or halts anything.
 */
export function TrackingStatusBanner({ health }: TrackingStatusBannerProps) {
  const active = MESSAGES.find(m => m.test(health));
  if (!active) return null;

  return (
    <div className="absolute bottom-16 sm:bottom-20 inset-x-3 sm:inset-x-4 z-20 flex justify-center pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 border border-on-dark-warning/40 backdrop-blur-md shadow-1 max-w-[92%]"
      >
        <span aria-hidden="true">{active.icon}</span>
        <p className="text-on-dark-warning text-xs sm:text-sm font-semibold text-center">{active.text}</p>
      </div>
    </div>
  );
}
