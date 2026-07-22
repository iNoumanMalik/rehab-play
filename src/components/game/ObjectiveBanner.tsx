interface ObjectiveBannerProps {
  text: string;
}

/**
 * Always-visible "what to do right now" banner — separate from the coaching
 * FeedbackOverlay (which is about form/technique). Readability means a player
 * should never have to guess the current goal, so this is real DOM text, high
 * contrast, and persistent rather than a fading toast.
 */
export function ObjectiveBanner({ text }: ObjectiveBannerProps) {
  if (!text) return null;

  return (
    <div className="absolute top-14 sm:top-16 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
      <div className="max-w-[90%] px-4 py-1.5 rounded-full bg-black/55 border border-white/15 backdrop-blur-md shadow-lg">
        {/* aria-live is the fallback for when Voice Guidance is off — it's the
            only other channel this "what to do now" objective is announced on. */}
        <p role="status" aria-live="polite" className="text-white text-xs sm:text-sm font-bold text-center truncate">{text}</p>
      </div>
    </div>
  );
}
