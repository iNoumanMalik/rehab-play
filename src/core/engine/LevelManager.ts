import type { LevelConfig } from '../../types';

export class LevelManager {
  currentLevel = 1;
  maxLevel = 5;

  private levels: LevelConfig[] = [
    { level: 1, name: 'Beginner', spawnRate: 2, speedMultiplier: 0.7, entityLimit: 5, requiredScore: 100, timeLimit: 60, hasBoss: false, description: 'Learn the basics' },
    { level: 2, name: 'Easy', spawnRate: 1.8, speedMultiplier: 0.85, entityLimit: 7, requiredScore: 200, timeLimit: 60, hasBoss: false, description: 'Getting warmer' },
    { level: 3, name: 'Medium', spawnRate: 1.5, speedMultiplier: 1, entityLimit: 10, requiredScore: 350, timeLimit: 75, hasBoss: false, description: 'Picking up speed' },
    { level: 4, name: 'Hard', spawnRate: 1.2, speedMultiplier: 1.2, entityLimit: 12, requiredScore: 500, timeLimit: 75, hasBoss: true, description: 'Things get serious' },
    { level: 5, name: 'Expert', spawnRate: 0.8, speedMultiplier: 1.5, entityLimit: 15, requiredScore: 750, timeLimit: 90, hasBoss: true, description: 'Master challenge' },
  ];

  getConfig(): LevelConfig {
    const idx = Math.min(this.currentLevel - 1, this.levels.length - 1);
    return this.levels[idx];
  }

  nextLevel(): boolean {
    if (this.currentLevel >= this.maxLevel) return false;
    this.currentLevel++;
    return true;
  }

  reset(): void {
    this.currentLevel = 1;
  }

  getSpeedMultiplier(): number {
    return this.getConfig().speedMultiplier;
  }

  getSpawnInterval(): number {
    return this.getConfig().spawnRate;
  }

  getEntityLimit(): number {
    return this.getConfig().entityLimit;
  }
}
