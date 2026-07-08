import type { CompensationFlag, ExerciseDefinition, RepEvent, RepPhase } from './types';

/**
 * A hysteresis state machine that turns a stream of calibrated activation
 * values into clean, form-checked repetitions.
 *
 *   idle → ascending (past engageThreshold)
 *        → hold      (past repThreshold; must dwell minHoldMs)
 *        → descending(back below releaseThreshold) ⇒ emit RepEvent
 *
 * A rep only counts toward therapy (`valid`) when the top was held long enough
 * and no blocking compensation (trunk lean / asymmetry) occurred during it.
 */
export class RepDetector {
  private phase: RepPhase = 'idle';
  private holdMs = 0;
  private peak = 0;
  private peakVelocity = 0;
  private prevActivation = 0;
  private repComps = new Map<string, CompensationFlag>();
  private reps = 0;
  private attempts = 0;
  private def: ExerciseDefinition;

  constructor(def: ExerciseDefinition) {
    this.def = def;
  }

  get validReps(): number { return this.reps; }
  get totalAttempts(): number { return this.attempts; }
  get currentPhase(): RepPhase { return this.phase; }

  /** Advance the machine one frame. Returns a RepEvent only when a rep completes. */
  update(activation: number, dt: number, liveComps: CompensationFlag[]): RepEvent | null {
    const velocity = dt > 0 ? Math.abs(activation - this.prevActivation) / dt : 0;
    this.prevActivation = activation;

    const { engageThreshold, repThreshold, releaseThreshold } = this.def;

    const trackRep = () => {
      this.peak = Math.max(this.peak, activation);
      this.peakVelocity = Math.max(this.peakVelocity, velocity);
      for (const c of liveComps) this.repComps.set(c.id, c);
    };

    switch (this.phase) {
      case 'idle':
        if (activation >= engageThreshold) {
          this.phase = 'ascending';
          this.peak = activation;
          this.peakVelocity = velocity;
          this.holdMs = 0;
          this.repComps.clear();
        }
        break;

      case 'ascending':
        trackRep();
        if (activation >= repThreshold) {
          this.phase = 'hold';
          this.holdMs = 0;
        } else if (activation < engageThreshold * 0.6) {
          this.phase = 'idle'; // abandoned before reaching the top
        }
        break;

      case 'hold':
        trackRep();
        this.holdMs += dt * 1000;
        if (activation < releaseThreshold) {
          return this.complete();
        }
        break;

      case 'descending':
        if (activation < engageThreshold) this.phase = 'idle';
        break;
    }

    return null;
  }

  private complete(): RepEvent {
    this.phase = 'descending';
    this.attempts++;

    const comps = [...this.repComps.values()];
    if (this.holdMs < this.def.minHoldMs) {
      comps.push({ id: 'short-hold', label: "Hold at the top a little longer" });
    }
    if (this.peakVelocity > this.def.maxRepVelocity) {
      comps.push({ id: 'too-fast', label: 'Move slower and more controlled' });
    }

    const blocking = comps.some(c => c.id === 'trunk-lean' || c.id === 'asymmetry');
    const heldEnough = this.holdMs >= this.def.minHoldMs;
    const valid = heldEnough && !blocking;

    // Quality: full range held cleanly = 1; deduct per issue.
    let quality = Math.min(1, this.peak / this.def.repThreshold);
    quality -= comps.length * 0.2;
    quality = Math.max(0, Math.min(1, quality));

    if (valid) this.reps++;

    return {
      valid,
      rom: this.peak,
      holdMs: this.holdMs,
      peakVelocity: this.peakVelocity,
      quality,
      compensations: comps,
    };
  }

  reset(): void {
    this.phase = 'idle';
    this.holdMs = 0;
    this.peak = 0;
    this.peakVelocity = 0;
    this.prevActivation = 0;
    this.repComps.clear();
    this.reps = 0;
    this.attempts = 0;
  }
}
