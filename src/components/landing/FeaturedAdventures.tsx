import { useMemo, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import type { GameMeta } from '../../types';
import { analyticsService } from '../../core/services/AnalyticsService';
import { useProgression } from '../../hooks/useProgression';
import { useSettings } from '../../hooks/useSettings';
import { AdventureSlide } from './AdventureSlide';
import { ADVENTURE_SHOWCASE, sessionCountFor } from './adventureShowcase';

interface FeaturedAdventuresProps {
  games: GameMeta[];
  onPlay: (gameId: string) => void;
}

function ArrowButton({ direction, onClick, disabled }: { direction: 'left' | 'right'; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Previous adventure' : 'Next adventure'}
      className="pointer-events-auto flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white hover:bg-black/55 transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        {direction === 'left'
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  );
}

/**
 * A pinned horizontal-scroll section: the user scrolls vertically as normal,
 * but that scroll drives a horizontal slide — one card leaves left as the
 * next arrives from the right — until the last card, at which point normal
 * vertical scrolling continues to whatever comes after this section.
 *
 * Built on native `position: sticky` + a scroll-linked `x` transform (not
 * wheel-event hijacking): the section is a tall track (`count * 100vh`); a
 * sticky viewport pins in place while that track's scroll budget is spent,
 * and scroll progress through it maps directly to the row's horizontal
 * offset. `useScroll`'s `['start start', 'end start']` offset means progress
 * 0 is where the pin engages and progress 1 is a full track-height of scroll
 * later — but sticky can only physically hold for (trackHeight - 100vh), so
 * the x-transform's input range is capped at that same fraction
 * (`releaseFraction`) so the slide finishes exactly as the section lets go,
 * instead of getting cut off or finishing early with a dead scroll zone.
 *
 * Reduced Motion gets a completely different, simpler layout: a plain
 * vertical stack, no pinning or hijacking at all.
 */
export function FeaturedAdventures({ games, onPlay }: FeaturedAdventuresProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { level } = useProgression();
  const [{ reducedMotion }] = useSettings();
  const history = useMemo(() => analyticsService.getHistory(), []);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const tags = useMemo(() => Array.from(new Set(games.map(g => g.tag))), [games]);
  const visibleGames = activeTag ? games.filter(g => g.tag === activeTag) : games;
  const count = visibleGames.length;
  const releaseFraction = count > 1 ? (count - 1) / count : 1;

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end start'] });
  const x = useTransform(scrollYProgress, [0, releaseFraction], ['0vw', `${-(count - 1) * 100}vw`]);

  useMotionValueEvent(scrollYProgress, 'change', v => {
    if (count <= 1) return;
    const idx = Math.round((Math.min(Math.max(v, 0), releaseFraction) / releaseFraction) * (count - 1));
    setActiveIndex(idx);
  });

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track || count <= 1) return;
    const clamped = Math.max(0, Math.min(count - 1, i));
    const targetProgress = (clamped / (count - 1)) * releaseFraction;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: trackTop + targetProgress * track.offsetHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  return (
    <section id="adventures" className="relative py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-14">
        <div className="text-center sm:text-left mb-6 sm:mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-text">Featured Adventures</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text font-display tracking-tight mt-2">
            Pick your next session
          </h2>
          <p className="text-muted text-sm sm:text-base mt-2 max-w-xl mx-auto sm:mx-0">
            Seven motion-tracked adventures, each targeting a different rehab focus — filter to narrow it down, then scroll to browse them one at a time.
          </p>
        </div>

        <div role="group" aria-label="Filter by focus area" className="flex flex-wrap justify-center sm:justify-start gap-2">
          <button
            onClick={() => setActiveTag(null)}
            aria-pressed={activeTag === null}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
              activeTag === null ? 'bg-accent border-accent text-white' : 'bg-surface-strong border-border text-muted hover:bg-surface-hover'
            }`}
          >
            All
          </button>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              aria-pressed={activeTag === tag}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                activeTag === tag ? 'bg-accent border-accent text-white' : 'bg-surface-strong border-border text-muted hover:bg-surface-hover'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {reducedMotion || count <= 1 ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          {visibleGames.map((meta, i) => (
            <div key={meta.id} className="h-[70vh] sm:h-[80vh]">
              <AdventureSlide
                meta={meta}
                showcase={ADVENTURE_SHOWCASE[meta.id]}
                sessions={sessionCountFor(meta.id, history)}
                level={level}
                index={i}
                onPlay={() => onPlay(meta.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div ref={trackRef} className="relative" style={{ height: `${count * 100}vh` }}>
          <div className="sticky top-0 h-screen overflow-hidden">
            <motion.div className="flex h-full" style={{ x, width: `${count * 100}vw` }}>
              {visibleGames.map((meta, i) => (
                <AdventureSlide
                  key={meta.id}
                  meta={meta}
                  showcase={ADVENTURE_SHOWCASE[meta.id]}
                  sessions={sessionCountFor(meta.id, history)}
                  level={level}
                  index={i}
                  onPlay={() => onPlay(meta.id)}
                />
              ))}
            </motion.div>

            <div className="absolute inset-y-0 left-1 sm:left-4 flex items-center pointer-events-none z-20">
              <ArrowButton direction="left" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} />
            </div>
            <div className="absolute inset-y-0 right-1 sm:right-4 flex items-center pointer-events-none z-20">
              <ArrowButton direction="right" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === count - 1} />
            </div>

            <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white text-xs sm:text-sm font-bold tabular-nums z-20">
              {String(activeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
