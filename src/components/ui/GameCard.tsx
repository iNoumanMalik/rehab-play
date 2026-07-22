import type { GameMeta } from '../../types';
import { Badge } from './primitives/Badge';

interface GameCardProps {
  meta: GameMeta;
  onClick: () => void;
}

export function GameCard({ meta, onClick }: GameCardProps) {
  return (
    <button
      data-card
      onClick={onClick}
      className="group relative bg-surface border border-border rounded-card shadow-1 text-left transition-all duration-[var(--dur-slow)] ease-[var(--ease-standard)] hover:-translate-y-1 hover:shadow-2 hover:border-border-strong cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus-ring)]/40 w-full p-6 sm:p-8"
    >
      <div aria-hidden="true" className="absolute top-5 right-5 sm:top-6 sm:right-6 text-4xl sm:text-5xl transform group-hover:scale-110 transition-transform duration-[var(--dur-slow)]">
        {meta.icon}
      </div>
      <div className="mb-3 sm:mb-4">
        <Badge tone={meta.tone}>{meta.tag}</Badge>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-text font-display">
        {meta.title}
      </h3>
      <p className="text-muted text-sm sm:text-base leading-relaxed mb-5 sm:mb-6 font-medium">
        {meta.description}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <span className="text-[10px] sm:text-xs text-faint font-semibold uppercase tracking-wider bg-surface-hover px-2.5 py-1 rounded-full">
          {meta.rehabFocus}
        </span>
      </div>
      <div className="flex items-center font-bold text-sm sm:text-base text-text">
        <span className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-accent after:transition-all after:duration-[var(--dur-base)] group-hover:after:w-full">
          Start Session
        </span>
        <svg aria-hidden="true" className="w-4 h-4 ml-2 transform group-hover:translate-x-1.5 transition-transform duration-[var(--dur-base)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </button>
  );
}
