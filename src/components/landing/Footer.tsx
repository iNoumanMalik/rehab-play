import { Link } from 'react-router-dom';
import type { GameMeta } from '../../types';

interface FooterProps {
  games: GameMeta[];
  onPlay: (gameId: string) => void;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const SOCIALS = [
  { label: 'GitHub', icon: '🐙' },
  { label: 'Twitter', icon: '🐦' },
  { label: 'Instagram', icon: '📷' },
];

export function Footer({ games, onPlay }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border bg-surface/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-1 flex-shrink-0">
                <span aria-hidden="true" className="text-lg">⚡</span>
              </div>
              <span className="font-extrabold text-text font-display text-lg">RehabPlay</span>
            </div>
            <p className="text-muted text-sm leading-relaxed mb-4 max-w-xs">
              AI-powered motion tracking that turns physical therapy into a game you'll want to finish.
            </p>
            <div className="flex items-center gap-2">
              {SOCIALS.map(s => (
                <button
                  key={s.label}
                  type="button"
                  aria-label={`${s.label} (placeholder)`}
                  className="w-9 h-9 rounded-full bg-surface-strong border border-border-strong flex items-center justify-center text-sm hover:bg-surface-hover transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                >
                  <span aria-hidden="true">{s.icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li><button onClick={() => scrollToId('adventures')} className="text-muted hover:text-text transition-colors cursor-pointer">Adventures</button></li>
              <li><button onClick={() => scrollToId('how-it-works')} className="text-muted hover:text-text transition-colors cursor-pointer">How It Works</button></li>
              <li><button onClick={() => scrollToId('accessibility')} className="text-muted hover:text-text transition-colors cursor-pointer">Accessibility</button></li>
              <li><Link to="/progress" className="text-muted hover:text-text transition-colors">Your Progress</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Games</h3>
            <ul className="space-y-2.5 text-sm">
              {games.slice(0, 5).map(g => (
                <li key={g.id}>
                  <button onClick={() => onPlay(g.id)} className="text-muted hover:text-text transition-colors cursor-pointer">
                    {g.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-faint mb-4">Contact</h3>
            <ul className="space-y-2.5 text-sm text-muted">
              <li>support@rehabplay.app</li>
              <li>
                <button onClick={() => scrollToId('accessibility')} className="hover:text-text transition-colors cursor-pointer">
                  Accessibility feedback
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-faint">
          <span>© {year} RehabPlay. All rights reserved.</span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
