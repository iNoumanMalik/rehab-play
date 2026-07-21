import type { GameMeta } from '../../types';

interface GameCardProps {
  meta: GameMeta;
  onClick: () => void;
}

export function GameCard({ meta, onClick }: GameCardProps) {
  return (
    <button
      data-card
      onClick={onClick}
      className={`group relative bg-gradient-to-br ${meta.gradient} border ${meta.border} rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-left transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1.5 hover:shadow-2xl ${meta.hoverGlow} backdrop-blur-md cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50 w-full`}
    >
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 text-4xl sm:text-5xl transform group-hover:scale-125 group-hover:rotate-6 transition-all duration-500">
        {meta.icon}
      </div>
      <div className="mb-3 sm:mb-4">
        <span className={`inline-block text-[10px] sm:text-xs font-extrabold uppercase tracking-widest px-3.5 py-1.5 rounded-full ${meta.tagColor} border border-white/5`}>
          {meta.tag}
        </span>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-[var(--color-text)] group-hover:text-[var(--color-text)] transition-colors">
        {meta.title}
      </h3>
      <p className="text-[var(--color-text-muted)] text-sm sm:text-base leading-relaxed mb-5 sm:mb-6 font-medium">
        {meta.description}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <span className="text-[10px] sm:text-xs text-[var(--color-text-faint)] font-semibold uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-full">
          {meta.rehabFocus}
        </span>
      </div>
      <div className="flex items-center font-bold text-sm sm:text-base text-[var(--color-text)] group-hover:text-[var(--color-text)]">
        <span className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all after:duration-300 group-hover:after:w-full">
          Start Session
        </span>
        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/0 via-white/0 to-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </button>
  );
}
