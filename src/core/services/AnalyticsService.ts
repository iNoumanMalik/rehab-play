import type { JointAngles, MovementData, GameId, SessionReport } from '../../types';
import { StorageService } from './StorageService';

export class AnalyticsService {
  private sessionStart = 0;
  private samples: { time: number; angles: Partial<JointAngles>; movement: Partial<MovementData> }[] = [];
  private currentGameId: GameId | null = null;

  startSession(gameId: GameId): void {
    this.sessionStart = Date.now();
    this.currentGameId = gameId;
    this.samples = [];
  }

  recordFrame(angles: JointAngles, movement: MovementData): void {
    if (!this.currentGameId) return;
    this.samples.push({
      time: Date.now() - this.sessionStart,
      angles: { ...angles },
      movement: { ...movement },
    });
  }

  endSession(score: number, level: number, maxCombo: number, accuracy: number, feedback: string[]): SessionReport {
    const duration = (Date.now() - this.sessionStart) / 1000;
    const report: SessionReport = {
      gameId: this.currentGameId!,
      date: new Date().toISOString(),
      duration,
      score,
      level,
      maxCombo,
      accuracy,
      avgAngles: this.averageAngles(),
      avgMovement: this.averageMovement(),
      feedback,
    };

    const history = StorageService.get<SessionReport[]>('session_history', []);
    history.push(report);
    StorageService.set('session_history', history.slice(-100));
    StorageService.update('total_sessions', (n: number) => n + 1, 0);
    StorageService.update('total_score', (n: number) => n + score, 0);

    this.currentGameId = null;
    this.samples = [];
    return report;
  }

  private averageAngles(): Partial<JointAngles> {
    if (this.samples.length === 0) return {};
    const avg: Record<string, number> = {};
    const keys = Object.keys(this.samples[0].angles) as (keyof JointAngles)[];
    for (const k of keys) {
      avg[k] = this.samples.reduce((s, f) => s + (f.angles[k] ?? 0), 0) / this.samples.length;
    }
    return avg as Partial<JointAngles>;
  }

  private averageMovement(): Partial<MovementData> {
    if (this.samples.length === 0) return {};
    const avg: Record<string, number> = {};
    const keys = ['rightWristVelocity', 'leftWristVelocity', 'rightReachDistance', 'leftReachDistance'] as (keyof MovementData)[];
    for (const k of keys) {
      const v = this.samples.reduce((s, f) => s + (f.movement[k] as number ?? 0), 0) / this.samples.length;
      avg[k] = v;
    }
    return avg as Partial<MovementData>;
  }

  getHistory(): SessionReport[] {
    return StorageService.get<SessionReport[]>('session_history', []);
  }

  getTotalSessions(): number {
    return StorageService.get<number>('total_sessions', 0);
  }

  getTotalScore(): number {
    return StorageService.get<number>('total_score', 0);
  }
}

export const analyticsService = new AnalyticsService();
