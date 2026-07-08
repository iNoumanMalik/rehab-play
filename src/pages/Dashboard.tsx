import { useEffect, useRef } from 'react';
import type { GameMeta } from '../types';
import { GameCard } from '../components/ui/GameCard';
import { StatCard } from '../components/ui/StatCard';
import { StorageService } from '../core/services/StorageService';
import { achievementService } from '../core/services/AchievementService';
import { useProgression } from '../hooks/useProgression';
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
  const { level, xpIntoLevel, xpForNextLevel, streakDays, dailyGoalCount, dailyGoalTarget } = useProgression();

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
        <StatCard value={level} label="Player Level" gradient="from-emerald-500/20 to-green-500/15" border="border-emerald-500/40" textColor="text-emerald-200" />
      </div>

      <div className="max-w-4xl mx-auto sm:mx-0 bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 sm:p-5 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-violet-200">Level {level}</span>
            <span className="text-[11px] text-white/50">{xpIntoLevel} / {xpForNextLevel} XP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
              style={{ width: `${Math.min(100, (xpIntoLevel / Math.max(1, xpForNextLevel)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-xs font-bold text-orange-200 whitespace-nowrap">
            🔥 {streakDays}-day streak
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-200 whitespace-nowrap">
            🎯 Daily goal {Math.min(dailyGoalCount, dailyGoalTarget)}/{dailyGoalTarget}
          </div>
        </div>
      </div>

      <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
        {games.map((meta) => (
          <GameCard key={meta.id} meta={meta} onClick={() => onStartGame(meta.id)} />
        ))}
      </div>
    </div>
  );
}
