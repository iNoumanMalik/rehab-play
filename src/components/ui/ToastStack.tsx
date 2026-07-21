import { useToasts } from '../../hooks/useToasts';
import { toastStore, type ToastKind } from '../../core/services/ToastStore';

const STYLES: Record<ToastKind, string> = {
  achievement: 'from-amber-500/25 to-orange-500/15 border-amber-500/40',
  levelup: 'from-violet-500/25 to-purple-500/15 border-violet-500/40',
  streak: 'from-orange-500/25 to-red-500/15 border-orange-500/40',
  goal: 'from-emerald-500/25 to-green-500/15 border-emerald-500/40',
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
          className={`pointer-events-auto flex items-start gap-3 bg-gradient-to-br ${STYLES[t.kind]} backdrop-blur-xl border rounded-2xl shadow-2xl p-3.5 animate-[toastIn_0.35s_ease-out]`}
        >
          <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{t.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-[var(--color-text)] truncate">{t.title}</p>
            {t.description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">{t.description}</p>}
          </div>
          <button
            onClick={() => toastStore.dismiss(t.id)}
            aria-label="Dismiss"
            className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] text-lg leading-none cursor-pointer flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
