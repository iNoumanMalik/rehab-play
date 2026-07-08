import { StorageService } from '../services/StorageService';
import type { CalibrationData } from './types';

/**
 * Holds a user's per-exercise ROM baseline and converts a raw effort metric
 * into a 0..1 activation relative to *their own* range. This is what makes the
 * games fair for someone recovering with limited range vs. a healthy user:
 * "full ROM" always means their full ROM, not a hard-coded angle.
 */
export class Calibration {
  private data: CalibrationData | null;
  private exerciseId: string;

  constructor(exerciseId: string) {
    this.exerciseId = exerciseId;
    this.data = StorageService.get<CalibrationData | null>(`calib_${exerciseId}`, null);
  }

  get raw(): CalibrationData | null {
    return this.data;
  }

  isCalibrated(): boolean {
    return this.data !== null && this.data.max > this.data.neutral;
  }

  /** Calibrated within the last `maxAgeMs` (default 12h)? */
  isFresh(maxAgeMs = 12 * 60 * 60 * 1000): boolean {
    if (!this.data) return false;
    return Date.now() - new Date(this.data.capturedAt).getTime() < maxAgeMs;
  }

  set(neutral: number, max: number, now: string): void {
    // Guarantee a usable, non-degenerate range.
    const span = Math.max(0.15, max - neutral);
    this.data = { exerciseId: this.exerciseId, neutral, max: neutral + span, capturedAt: now };
    StorageService.set(`calib_${this.exerciseId}`, this.data);
  }

  /** Raw effort → activation in [0, ~1.3]. Falls back to a sane default if uncalibrated. */
  activation(effort: number): number {
    const neutral = this.data ? this.data.neutral : -0.2;
    const max = this.data ? this.data.max : 1.0;
    const a = (effort - neutral) / Math.max(0.15, max - neutral);
    return Math.max(0, Math.min(1.3, a));
  }
}
