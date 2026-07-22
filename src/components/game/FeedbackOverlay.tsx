interface FeedbackOverlayProps {
  messages: string[];
  visible: boolean;
}

export function FeedbackOverlay({ messages, visible }: FeedbackOverlayProps) {
  if (!visible || messages.length === 0) return null;

  const getColor = (msg: string) => {
    if (msg.includes('Excellent') || msg.includes('Great') || msg.includes('Full range') || msg.includes('perfect')) return 'text-on-dark-success bg-success/20 border-success/30';
    if (msg.includes('control') || msg.includes('good') || msg.includes('Nice')) return 'text-on-dark-accent bg-accent/20 border-accent/30';
    if (msg.includes('higher') || msg.includes('Straighten') || msg.includes('Reach') || msg.includes('further')) return 'text-on-dark-warning bg-warning/20 border-warning/30';
    return 'text-white bg-surface-hover border-white/20';
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none max-w-[92%]"
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`px-4 py-2 rounded-full text-sm sm:text-base font-bold backdrop-blur-md border shadow-1 animate-[fadeInUp_0.3s_ease-out] ${getColor(msg)}`}
        >
          {msg}
        </div>
      ))}
    </div>
  );
}
