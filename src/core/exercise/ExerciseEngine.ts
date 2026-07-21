import type { PoseData } from '../../types';
import type { Calibration } from './Calibration';
import { CoachEngine } from './CoachEngine';
import { RepDetector } from './RepDetector';
import { trunkLeanDeg, elevationAsymmetry, upperBodyTracked } from './metrics';
import { settingsStore, type Settings } from '../services/SettingsStore';
import type { CompensationFlag, ExerciseDefinition, ExerciseFrame } from './types';

/**
 * Per-frame brain for a game: turns a raw pose into a calibrated, form-checked
 * ExerciseFrame (activation, phase, reps, compensations, coaching). Games read
 * this instead of raw wrist coordinates, so only correct movements count.
 */
// A momentary tracking dip (one bad frame, brief occlusion) shouldn't cancel an
// in-progress rep or flash "step back" at the player — only a sustained loss
// of tracking should. During the grace window we keep serving the last known
// good frame (minus the rep-completion event, which only fires on live data).
const TRACKING_GRACE_MS = 400;

const DIFFICULTY_FACTOR: Record<Settings['difficulty'], number> = {
  gentle: 0.82,
  standard: 1,
  challenging: 1.12,
};

/**
 * Difficulty + Motion Sensitivity are Personalization settings (Flexibility &
 * Personalization) that must actually change how movements are gated, not sit
 * as inert toggles. Rather than mutate the shared, module-level exercise
 * definitions (they're singletons reused across every session), build a tuned
 * copy once per session: "gentle"/looser sensitivity lowers how much range is
 * required and how strictly lean/asymmetry/speed compensations are flagged;
 * "challenging"/tighter sensitivity raises the bar. `strictness` is clamped so
 * an exercise never becomes impossible or trivially free-scoring.
 */
function tuneDefinition(def: ExerciseDefinition, settings: Settings): ExerciseDefinition {
  const strictness = Math.max(0.6, Math.min(1.4, DIFFICULTY_FACTOR[settings.difficulty] * settings.motionSensitivity));
  if (strictness === 1) return def;
  return {
    ...def,
    engageThreshold: Math.max(0.05, def.engageThreshold * strictness),
    repThreshold: Math.max(0.1, def.repThreshold * strictness),
    releaseThreshold: Math.max(0.05, def.releaseThreshold * strictness),
    minHoldMs: Math.max(0, Math.round(def.minHoldMs * strictness)),
    maxTrunkLeanDeg: def.maxTrunkLeanDeg / strictness,
    maxAsymmetry: def.maxAsymmetry / strictness,
    maxRepVelocity: def.maxRepVelocity / strictness,
  };
}

export class ExerciseEngine {
  private def: ExerciseDefinition;
  private calibration: Calibration;
  private reps: RepDetector;
  private coach: CoachEngine;
  private romMax = 0;
  private quality = 1;
  private untrackedMs = 0;
  private lastGoodFrame: ExerciseFrame | null = null;

  constructor(def: ExerciseDefinition, calibration: Calibration) {
    this.def = tuneDefinition(def, settingsStore.get());
    this.calibration = calibration;
    this.reps = new RepDetector(this.def);
    this.coach = new CoachEngine(this.def);
  }

  process(pose: PoseData | null, dt: number): ExerciseFrame {
    const lm = pose?.smoothLandmarks ?? [];
    const tracked = pose != null && upperBodyTracked(lm);

    if (!tracked) {
      this.untrackedMs += dt * 1000;
      if (this.lastGoodFrame && this.untrackedMs < TRACKING_GRACE_MS) {
        return { ...this.lastGoodFrame, rep: null };
      }
      return {
        tracked: false, activation: 0, effort: 0, phase: this.reps.currentPhase,
        reps: this.reps.validReps, attempts: this.reps.totalAttempts, rep: null,
        compensations: [], coach: { id: 'no-track', text: 'Step back so your upper body is in view', severity: 'cue' },
        quality: this.quality, romMax: this.romMax,
      };
    }
    this.untrackedMs = 0;

    const effort = this.def.effort(lm);
    const activation = this.calibration.activation(effort);
    this.romMax = Math.max(this.romMax, activation);

    const compensations = this.detectCompensations(lm, activation);
    const rep = this.reps.update(activation, dt, compensations);
    if (rep) {
      this.quality = this.quality * 0.6 + rep.quality * 0.4;
    }

    const coach = this.coach.update(
      { tracked, activation, phase: this.reps.currentPhase, compensations, rep, lm },
      dt,
    );

    const frame: ExerciseFrame = {
      tracked: true,
      activation,
      effort,
      phase: this.reps.currentPhase,
      reps: this.reps.validReps,
      attempts: this.reps.totalAttempts,
      rep,
      compensations,
      coach,
      quality: this.quality,
      romMax: this.romMax,
    };
    this.lastGoodFrame = frame;
    return frame;
  }

  private detectCompensations(lm: import('../../types').PoseLandmark[], activation: number): CompensationFlag[] {
    const flags: CompensationFlag[] = [];
    // Only judge compensation while the user is actually engaged in the movement.
    const engaged = activation >= this.def.engageThreshold;

    if (this.def.checkTrunkLean && engaged && trunkLeanDeg(lm) > this.def.maxTrunkLeanDeg) {
      flags.push({ id: 'trunk-lean', label: 'Keep your torso upright — no leaning' });
    }
    if (this.def.checkAsymmetry && engaged && elevationAsymmetry(lm) > this.def.maxAsymmetry) {
      flags.push({ id: 'asymmetry', label: 'Raise both arms together, evenly' });
    }
    return flags;
  }

  reset(): void {
    this.reps.reset();
    this.coach.reset();
    this.romMax = 0;
    this.quality = 1;
    this.untrackedMs = 0;
    this.lastGoodFrame = null;
  }
}
