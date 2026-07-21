interface FeedbackOverlayProps {
  messages: string[];
  visible: boolean;
}

export function FeedbackOverlay({ messages, visible }: FeedbackOverlayProps) {
  if (!visible || messages.length === 0) return null;

  const getColor = (msg: string) => {
    if (msg.includes('Excellent') || msg.includes('Great') || msg.includes('Full range') || msg.includes('perfect')) return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
    if (msg.includes('control') || msg.includes('good') || msg.includes('Nice')) return 'text-blue-300 bg-blue-500/20 border-blue-500/30';
    if (msg.includes('higher') || msg.includes('Straighten') || msg.includes('Reach') || msg.includes('further')) return 'text-amber-300 bg-amber-500/20 border-amber-500/30';
    return 'text-[var(--color-text)] bg-[var(--color-surface-hover)] border-white/20';
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none"
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`px-4 py-2 rounded-full text-sm sm:text-base font-bold backdrop-blur-md border shadow-lg animate-[fadeInUp_0.3s_ease-out] ${getColor(msg)}`}
        >
          {msg}
        </div>
      ))}
    </div>
  );
}
