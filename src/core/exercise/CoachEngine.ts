import type { CoachContext, CoachMessage, ExerciseDefinition } from './types';

/**
 * Evaluates an exercise's coaching rules against the live frame and returns at
 * most one rate-limited cue, so the player gets timely, exercise-specific
 * guidance ("Straighten your elbow") instead of a generic firehose.
 */
export class CoachEngine {
  private current: CoachMessage | null = null;
  private lastChangeAt = 0;
  private elapsedMs = 0;
  private readonly cooldownMs = 1400;
  private def: ExerciseDefinition;

  constructor(def: ExerciseDefinition) {
    this.def = def;
  }

  update(ctx: CoachContext, dt: number): CoachMessage | null {
    this.elapsedMs += dt * 1000;

    // A completed rep always gets immediate, priority feedback.
    if (ctx.rep) {
      const msg: CoachMessage = ctx.rep.valid
        ? { id: 'rep-good', text: pickPraise(ctx.rep.quality), severity: ctx.rep.quality > 0.85 ? 'perfect' : 'good' }
        : { id: 'rep-bad', text: ctx.rep.compensations[0]?.label ?? 'Not quite — try again', severity: 'warn' };
      this.current = msg;
      this.lastChangeAt = this.elapsedMs;
      return this.current;
    }

    if (this.elapsedMs - this.lastChangeAt < this.cooldownMs) return this.current;

    for (const rule of this.def.coachRules) {
      const text = rule.test(ctx);
      if (text) {
        if (text !== this.current?.text) {
          this.current = { id: rule.id, text, severity: rule.severity };
          this.lastChangeAt = this.elapsedMs;
        }
        return this.current;
      }
    }

    // Nothing to correct — clear stale cues after the cooldown.
    if (this.elapsedMs - this.lastChangeAt > this.cooldownMs) this.current = null;
    return this.current;
  }

  reset(): void {
    this.current = null;
    this.lastChangeAt = 0;
    this.elapsedMs = 0;
  }
}

const PRAISE = ['Great rep!', 'Excellent control!', 'Perfect form!', 'Nicely done!', 'Strong and steady!'];
function pickPraise(quality: number): string {
  if (quality > 0.9) return 'Perfect form!';
  if (quality > 0.75) return 'Great rep!';
  return PRAISE[Math.min(PRAISE.length - 1, Math.floor(quality * PRAISE.length))];
}
