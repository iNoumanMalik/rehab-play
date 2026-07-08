class LowPassFilter {
  private y: number | null = null;

  filter(x: number, alpha: number): number {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }

  get last(): number | null { return this.y; }

  reset(): void { this.y = null; }
}

/**
 * One-Euro filter (Casiez, Roussel & Vogel, 2012) — the standard fix for the
 * "smooth vs. laggy" trade-off in noisy real-time tracking (used widely in
 * pose/AR input). A plain moving average kills jitter but adds latency
 * proportional to its window size, which is exactly why players felt the game
 * "didn't see" their movement. One-Euro instead adapts its cutoff to how fast
 * the signal is currently changing: nearly still → heavy smoothing (stable,
 * no jitter); moving fast → light smoothing (snaps to the true position with
 * minimal added delay).
 */
export class OneEuroFilter {
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;
  private lastDerivative = 0;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  constructor(minCutoff = 1.2, beta = 0.4, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  /** Filter one scalar sample. `timestampMs` must be monotonically increasing. */
  filter(x: number, timestampMs: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      this.xFilter.filter(x, 1);
      return x;
    }
    const dt = Math.max(0.001, (timestampMs - this.lastTime) / 1000);
    this.lastTime = timestampMs;

    const prevX = this.xFilter.last ?? x;
    const dx = (x - prevX) / dt;
    const dxHat = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));
    this.lastDerivative = dxHat;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    return this.xFilter.filter(x, this.alpha(cutoff, dt));
  }

  /** Filtered rate of change of the signal, per second — used for short-horizon prediction. */
  get velocity(): number { return this.lastDerivative; }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
    this.lastDerivative = 0;
  }
}
