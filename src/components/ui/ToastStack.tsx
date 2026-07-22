import { useToasts } from '../../hooks/useToasts';
import { toastStore, type ToastKind } from '../../core/services/ToastStore';
import type { Tone } from '../../types/theme';

const TONES: Record<ToastKind, Tone> = {
  achievement: 'accent',
  levelup: 'success',
  streak: 'warning',
  goal: 'neutral',
};

const TONE_BG: Record<Tone, string> = {
  accent: 'bg-accent/15 border-accent/40',
  success: 'bg-success/15 border-success/40',
  warning: 'bg-warning/15 border-warning/40',
  danger: 'bg-danger/15 border-danger/40',
  neutral: 'bg-surface-strong border-border-strong',
};

/** Mounted once near the app root; celebrates achievements/level-ups/streaks/daily goals. */
export function ToastStack() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 sm:top-24 right-3 sm:right-6 z-50 flex flex-col gap-2.5 w-[calc(100%-1.5rem)] sm:w-80 pointer-events-none"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 backdrop-blur-xl border rounded-card shadow-2 p-3.5 animate-[toastIn_0.35s_ease-out] ${TONE_BG[TONES[t.kind]]}`}
        >
          <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{t.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-text truncate">{t.title}</p>
            {t.description && <p className="text-xs text-muted mt-0.5 leading-snug">{t.description}</p>}
          </div>
          <button
            onClick={() => toastStore.dismiss(t.id)}
            aria-label="Dismiss"
            className="text-faint hover:text-text text-lg leading-none cursor-pointer flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
