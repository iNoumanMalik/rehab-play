import type { PoseLandmark } from '../../types';
import { OneEuroFilter } from './OneEuroFilter';

interface Filters { x: OneEuroFilter; y: OneEuroFilter; z: OneEuroFilter; }

/** Estimated camera+model+render pipeline latency to compensate for via prediction. */
export const PREDICTION_HORIZON_SEC = 0.08;

/**
 * Smooths pose landmarks with a One-Euro filter instead of a moving average
 * (see OneEuroFilter.ts for why). Also tracks each landmark's filtered
 * velocity so callers can extrapolate a short-horizon predicted position —
 * compensating for the ~1-2 frames of camera/model/render latency that made
 * hits feel like they registered "late."
 */
export class JointSmoother {
  private filters: Map<number, Filters> = new Map();
  private minCutoff: number;
  private beta: number;

  constructor(minCutoff = 1.2, beta = 0.4) {
    this.minCutoff = minCutoff;
    this.beta = beta;
  }

  smooth(landmarks: PoseLandmark[], timestampMs: number): PoseLandmark[] {
    return landmarks.map((lm, i) => {
      if (!this.filters.has(i)) {
        this.filters.set(i, {
          x: new OneEuroFilter(this.minCutoff, this.beta),
          y: new OneEuroFilter(this.minCutoff, this.beta),
          z: new OneEuroFilter(this.minCutoff * 0.6, this.beta),
        });
      }
      const f = this.filters.get(i)!;
      return {
        x: f.x.filter(lm.x, timestampMs),
        y: f.y.filter(lm.y, timestampMs),
        z: f.z.filter(lm.z, timestampMs),
        visibility: lm.visibility,
      };
    });
  }

  /** Extrapolate already-smoothed landmarks forward by `horizonSec` using each one's filtered velocity. */
  predict(smoothed: PoseLandmark[], horizonSec: number): PoseLandmark[] {
    return smoothed.map((lm, i) => {
      const f = this.filters.get(i);
      if (!f) return lm;
      return { ...lm, x: lm.x + f.x.velocity * horizonSec, y: lm.y + f.y.velocity * horizonSec };
    });
  }

  reset(): void {
    this.filters.clear();
  }
}
