import type { GameStats, Achievement } from '../../types';
import { StorageService } from './StorageService';

const BUILTIN_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first-catch', title: 'First Catch', description: 'Catch your first target', icon: '🎯', condition: (s) => s.successfulActions >= 1 },
  { id: 'combo-5', title: 'Combo Starter', description: 'Reach a 5x combo', icon: '🔥', condition: (s) => s.maxCombo >= 5 },
  { id: 'combo-10', title: 'Combo Master', description: 'Reach a 10x combo', icon: '💥', condition: (s) => s.maxCombo >= 10 },
  { id: 'level-3', title: 'Getting Stronger', description: 'Reach level 3 in any game', icon: '💪', condition: (s) => s.level >= 3 },
  { id: 'level-5', title: 'Peak Performance', description: 'Reach level 5 in any game', icon: '🏆', condition: (s) => s.level >= 5 },
  { id: 'score-500', title: 'Point Collector', description: 'Score 500 points in a session', icon: '⭐', condition: (s) => s.score >= 500 },
  { id: 'score-1000', title: 'High Scorer', description: 'Score 1000 points in a session', icon: '🌟', condition: (s) => s.score >= 1000 },
  { id: 'perfect-accuracy', title: 'Perfect Form', description: 'Achieve 100% accuracy', icon: '✨', condition: (s) => s.accuracy >= 100 },
  { id: 'ten-sessions', title: 'Dedicated', description: 'Complete 10 sessions', icon: '📅', condition: ((_s: GameStats) => { void _s; return false; }) },
  { id: 'speed-demon', title: 'Speed Demon', description: 'Catch 20 targets in one session', icon: '⚡', condition: (s) => s.successfulActions >= 20 },
];

export class AchievementService {
  private unlocked: Set<string> = new Set(
    StorageService.get<string[]>('unlocked_achievements', []),
  );

  check(stats: GameStats): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const def of BUILTIN_ACHIEVEMENTS) {
      if (this.unlocked.has(def.id)) continue;
      const ach: Achievement = { ...def, unlocked: false };
      if (def.condition(stats)) {
        ach.unlocked = true;
        ach.unlockedAt = new Date().toISOString();
        this.unlocked.add(def.id);
        newlyUnlocked.push(ach);
      }
    }

    if (newlyUnlocked.length > 0) {
      StorageService.set('unlocked_achievements', [...this.unlocked]);
    }

    return newlyUnlocked;
  }

  getAll(): Achievement[] {
    return BUILTIN_ACHIEVEMENTS.map(def => ({
      ...def,
      unlocked: this.unlocked.has(def.id),
      unlockedAt: undefined,
    }));
  }

  getUnlocked(): Achievement[] {
    return this.getAll().filter(a => a.unlocked);
  }

  getLocked(): Achievement[] {
    return this.getAll().filter(a => !a.unlocked);
  }
}

export const achievementService = new AchievementService();
