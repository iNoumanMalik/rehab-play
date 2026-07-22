import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { GameCard } from '../components/ui/GameCard';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/primitives/Badge';
import { StorageService } from '../core/services/StorageService';
import { achievementService } from '../core/services/AchievementService';
import { useProgression } from '../hooks/useProgression';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { AppOutletContext } from '../App';
import gsap from 'gsap';

export function LandingPage() {
  const { games, startGame } = useOutletContext<AppOutletContext>();
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useDocumentTitle('RehabPlay — Gamified Physiotherapy');
  useEffect(() => { headingRef.current?.focus(); }, []);

  const totalScore = StorageService.get<number>('total_score', 0);
  const totalSessions = StorageService.get<number>('total_sessions', 0);
  const achievements = achievementService.getUnlocked().length;
  const totalAchievements = achievementService.getAll().length;
  const { level, xpIntoLevel, xpForNextLevel, streakDays, dailyGoalCount, dailyGoalTarget } = useProgression();

  // Filter by focus area (Hick's Law — a flat, uncategorized grid of 7+ games
  // doesn't scale). Reuses the existing `tag` field rather than inventing a
  // new taxonomy field.
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const tags = useMemo(() => Array.from(new Set(games.map(g => g.tag))), [games]);
  const visibleGames = activeTag ? games.filter(g => g.tag === activeTag) : games;

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    }
  }, []);

  useEffect(() => {
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('[data-card]');
      gsap.fromTo(cards, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' });
    }
  }, []);

  return (
    <div className="space-y-10 sm:space-y-12">
      <div ref={headerRef} className="text-center sm:text-left">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text font-display tracking-tight outline-none">
          Move better, every day
        </h1>
        <p className="text-muted mt-2 sm:mt-3 text-sm sm:text-base max-w-2xl leading-relaxed">
          Motion-tracked rehab exercises that adapt to your own range of motion — no controller, just your webcam and your body.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto sm:mx-0">
        <StatCard value={totalScore} label="Total Score" tone="accent" />
        <StatCard value={totalSessions} label="Sessions" tone="neutral" />
        <StatCard value={`${achievements}/${totalAchievements}`} label="Achievements" tone="warning" />
        <StatCard value={level} label="Player Level" tone="success" />
      </div>

      <div className="max-w-4xl mx-auto sm:mx-0 bg-surface border border-border rounded-card p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-accent-text">Level {level}</span>
            <span className="text-[11px] text-faint">{xpIntoLevel} / {xpForNextLevel} XP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, (xpIntoLevel / Math.max(1, xpForNextLevel)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Badge tone="warning">🔥 {streakDays}-day streak</Badge>
          <Badge tone="success">🎯 Daily goal {Math.min(dailyGoalCount, dailyGoalTarget)}/{dailyGoalTarget}</Badge>
        </div>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-text font-display mb-4 sm:mb-6">Choose your exercise</h2>

        <div role="group" aria-label="Filter by focus area" className="flex flex-wrap gap-2 mb-5 sm:mb-6">
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

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
          {visibleGames.map((meta) => (
            <GameCard key={meta.id} meta={meta} onClick={() => startGame(meta.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
