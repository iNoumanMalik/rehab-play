import type { PoseData } from '../../types';
import type { Calibration } from './Calibration';
import { CoachEngine } from './CoachEngine';
import { RepDetector } from './RepDetector';
import { trunkLeanDeg, elevationAsymmetry, upperBodyTracked } from './metrics';
import type { CompensationFlag, ExerciseDefinition, ExerciseFrame } from './types';

/**
 * Per-frame brain for a game: turns a raw pose into a calibrated, form-checked
 * ExerciseFrame (activation, phase, reps, compensations, coaching). Games read
 * this instead of raw wrist coordinates, so only correct movements count.
 */
export class ExerciseEngine {
  private def: ExerciseDefinition;
  private calibration: Calibration;
  private reps: RepDetector;
  private coach: CoachEngine;
  private romMax = 0;
  private quality = 1;

  constructor(def: ExerciseDefinition, calibration: Calibration) {
    this.def = def;
    this.calibration = calibration;
    this.reps = new RepDetector(def);
    this.coach = new CoachEngine(def);
  }

  process(pose: PoseData | null, dt: number): ExerciseFrame {
    const lm = pose?.smoothLandmarks ?? [];
    const tracked = pose != null && upperBodyTracked(lm);

    if (!tracked) {
      return {
        tracked: false, activation: 0, effort: 0, phase: this.reps.currentPhase,
        reps: this.reps.validReps, attempts: this.reps.totalAttempts, rep: null,
        compensations: [], coach: { id: 'no-track', text: 'Step back so your upper body is in view', severity: 'cue' },
        quality: this.quality, romMax: this.romMax,
      };
    }

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

    return {
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
  }
}
