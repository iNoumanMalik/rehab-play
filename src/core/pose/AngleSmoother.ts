import type { JointAngles } from '../../types';

const ALPHA = 0.35;

/**
 * Light EMA over the derived joint angles — a final pass to settle residual
 * angular jitter after landmark stabilization (angles are a atan2 of two
 * vectors, which can still amplify small positional noise even when the
 * landmarks feeding them are individually stable).
 */
export class AngleSmoother {
  private last: JointAngles | null = null;

  smooth(angles: JointAngles): JointAngles {
    if (!this.last) {
      this.last = angles;
      return angles;
    }
    const prev = this.last;
    const out = { ...angles };
    for (const key of Object.keys(angles) as (keyof JointAngles)[]) {
      out[key] = prev[key] + (angles[key] - prev[key]) * ALPHA;
    }
    this.last = out;
    return out;
  }

  reset(): void {
    this.last = null;
  }
}
