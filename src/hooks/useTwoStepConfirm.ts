import { useCallback, useRef, useState } from 'react';

/**
 * A cheap "are you sure?" for actions that shouldn't be one accidental click
 * away (e.g. quitting an in-progress rehab session) but also shouldn't be a
 * full modal dialog. First call arms it (caller re-labels its own control,
 * e.g. "Exit" -> "Confirm Exit?"); a second call within `resetMs` runs the
 * action; otherwise it silently disarms.
 */
export function useTwoStepConfirm(action: () => void, resetMs = 3000) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const trigger = useCallback(() => {
    if (armed) {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
      setArmed(false);
      action();
      return;
    }
    setArmed(true);
    timeoutRef.current = window.setTimeout(() => setArmed(false), resetMs);
  }, [armed, action, resetMs]);

  return { armed, trigger };
}
