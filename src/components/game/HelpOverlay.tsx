import { useEffect, useRef } from 'react';
import type { GameId } from '../../types';
import { getGameMeta } from '../../games/gameRegistry';

interface HelpOverlayProps {
  gameId?: GameId | null;
  onClose: () => void;
}

/**
 * A non-pausing, re-openable "how to play" reference — the mid-session
 * re-entry point onboarding can't provide (onboarding is one-time; the intro
 * screen's instructions are shown once, before calibration). For a rehab tool
 * used across days, this is what lets a patient recall correct form without
 * redoing calibration blind (Nielsen #10, Help & documentation).
 */
export function HelpOverlay({ gameId, onClose }: HelpOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const meta = gameId ? getGameMeta(gameId) : undefined;

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md px-4 py-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="How to play"
        className="w-full max-w-md bg-black/55 border border-white/10 rounded-card shadow-3 p-6 sm:p-8 text-left outline-none animate-[popIn_0.35s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-white font-display">How to Play</h2>
          <button
            onClick={onClose}
            aria-label="Close help"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            ✕
          </button>
        </div>

        {meta && (
          <div className="mb-5">
            <p className="text-on-dark-accent text-sm font-semibold mb-1">🎯 {meta.rehabFocus}</p>
            <p className="text-white/80 text-sm leading-relaxed">{meta.instructions}</p>
          </div>
        )}

        <div className="border-t border-white/10 pt-4 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/50 mb-2">How movement scoring works</p>
          <p className="text-white/70 text-xs leading-relaxed">
            Each exercise turns one specific movement — a reach, an overhead press, a lean — into on-screen action.
            Calibration measures your own comfortable range first, so only clean movement inside that range counts;
            leaning or twisting to "cheat" a reach won't score.
          </p>
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/50 mb-2">Keyboard shortcuts</p>
          <ul className="text-white/70 text-xs leading-relaxed space-y-1">
            <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-mono">Space</kbd> Pause / Resume</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-mono">M</kbd> Mute / Unmute</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-mono">?</kbd> Toggle this help</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-mono">Esc</kbd> Pause</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
