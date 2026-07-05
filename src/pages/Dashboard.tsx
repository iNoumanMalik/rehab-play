import { useEffect, useRef } from 'react';
import type { GameMeta } from '../types';
import { GameCard } from '../components/ui/GameCard';
import { StatCard } from '../components/ui/StatCard';
import { StorageService } from '../core/services/StorageService';
import { achievementService } from '../core/services/AchievementService';
import gsap from 'gsap';

interface DashboardProps {
  games: GameMeta[];
  onStartGame: (id: string) => void;
}

export function Dashboard({ games, onStartGame }: DashboardProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const totalScore = StorageService.get<number>('total_score', 0);
  const totalSessions = StorageService.get<number>('total_sessions', 0);
  const achievements = achievementService.getUnlocked().length;
  const totalAchievements = achievementService.getAll().length;

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    }
  }, []);

  useEffect(() => {
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('[data-card]');
      gsap.fromTo(cards, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.5)' });
    }
  }, []);

  return (
    <div className="space-y-8 sm:space-y-10">
      <div ref={headerRef} className="text-center sm:text-left">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent tracking-tight">
          Choose Your Exercise
        </h2>
        <p className="text-white/60 mt-2 sm:mt-3 text-sm sm:text-base max-w-2xl leading-relaxed">
          Select a therapeutic, motion-controlled activity below to start your rehabilitation session.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto sm:mx-0">
        <StatCard value={totalScore} label="Total Score" gradient="from-violet-500/20 to-purple-500/15" border="border-violet-500/40" textColor="text-violet-200" />
        <StatCard value={totalSessions} label="Sessions" gradient="from-cyan-500/20 to-blue-500/15" border="border-cyan-500/40" textColor="text-cyan-200" />
        <StatCard value={`${achievements}/${totalAchievements}`} label="Achievements" gradient="from-amber-500/20 to-orange-500/15" border="border-amber-500/40" textColor="text-amber-200" />
        <StatCard value={Math.floor(totalSessions / 3) + 1} label="Player Level" gradient="from-emerald-500/20 to-green-500/15" border="border-emerald-500/40" textColor="text-emerald-200" />
      </div>

      <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
        {games.map((meta) => (
          <GameCard key={meta.id} meta={meta} onClick={() => onStartGame(meta.id)} />
        ))}
      </div>
    </div>
  );
}
