import { useEffect, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useLastSpoken } from '../../hooks/useVoiceGuidance';

const VISIBLE_MS = 4200;

/**
 * On-screen text equivalent for anything Voice Guidance speaks — a WCAG-style
 * caption track for the app's own audio cues, not just game SFX. Only shows
 * when both Voice Guidance and Captions are enabled, so it never duplicates
 * text that's already shown as a caption elsewhere.
 */
export function CaptionBar() {
  const [{ voiceGuidanceOn, captionsOn }] = useSettings();
  const spoken = useLastSpoken();
  // Derived, not stateful: "expiredAt" is only ever written from the timeout
  // callback (never synchronously in the effect body), and visibility is
  // computed from it during render — avoids the cascading-render setState-in-
  // effect anti-pattern while still hiding the caption after VISIBLE_MS.
  const [expiredAt, setExpiredAt] = useState<number | null>(null);

  useEffect(() => {
    if (!spoken) return;
    const t = window.setTimeout(() => setExpiredAt(spoken.at), VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [spoken]);

  const visible = Boolean(spoken) && spoken!.at !== expiredAt;

  if (!voiceGuidanceOn || !captionsOn || !visible || !spoken) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] px-4 py-2 rounded-xl bg-black/80 border border-white/20 backdrop-blur-md shadow-2xl pointer-events-none"
    >
      <p className="text-white text-sm font-semibold text-center flex items-center gap-2">
        <span aria-hidden="true">🔊</span>
        {spoken.text}
      </p>
    </div>
  );
}
