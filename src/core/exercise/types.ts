import type { PoseLandmark, PoseData } from '../../types';

/** Which side of the body a metric refers to. */
export type Side = 'left' | 'right' | 'both';

export type RepPhase = 'idle' | 'ascending' | 'hold' | 'descending';

export type CompensationId = 'trunk-lean' | 'asymmetry' | 'too-fast' | 'short-hold' | 'low-range';

export interface CompensationFlag {
  id: CompensationId;
  label: string;
}

/** perfect > good > correct are positive; warn/cue are corrective. */
export type CoachSeverity = 'perfect' | 'good' | 'correct' | 'warn' | 'cue';

export interface CoachMessage {
  id: string;
  text: string;
  severity: CoachSeverity;
}

/** Emitted the moment a repetition completes (whether or not it was valid). */
export interface RepEvent {
  /** Met the hold + form requirements — counts toward therapeutic reps. */
  valid: boolean;
  /** Peak activation reached during the rep (0..1+). */
  rom: number;
  /** How long the top position was held, in ms. */
  holdMs: number;
  /** Peak activation velocity during the rep (units/sec). */
  peakVelocity: number;
  /** Overall movement quality 0..1. */
  quality: number;
  compensations: CompensationFlag[];
}

/** The per-frame output of the ExerciseEngine that games consume. */
export interface ExerciseFrame {
  /** Key joints are visible/confident enough to trust this frame. */
  tracked: boolean;
  /** Calibrated progress through the movement, 0 (rest) .. 1 (full ROM), can exceed 1. */
  activation: number;
  /** Uncalibrated raw effort metric (for analytics/debug). */
  effort: number;
  phase: RepPhase;
  /** Count of valid reps so far this session. */
  reps: number;
  /** Total rep attempts (valid + invalid). */
  attempts: number;
  /** Present only on the frame a rep completes. */
  rep: RepEvent | null;
  /** Active form problems right now. */
  compensations: CompensationFlag[];
  /** Current coaching cue (rate-limited), or null. */
  coach: CoachMessage | null;
  /** Rolling movement quality, 0..1. */
  quality: number;
  /** Best activation reached this session (session ROM). */
  romMax: number;
}

export interface CalibrationData {
  exerciseId: string;
  /** Raw effort at rest. */
  neutral: number;
  /** Raw effort at full voluntary range. */
  max: number;
  capturedAt: string;
}

export interface CoachContext {
  tracked: boolean;
  activation: number;
  phase: RepPhase;
  compensations: CompensationFlag[];
  /** The rep that just completed this frame, if any. */
  rep: RepEvent | null;
  lm: PoseLandmark[];
}

export interface CoachRule {
  id: string;
  severity: CoachSeverity;
  /** Return the cue text when the rule fires, else null. */
  test: (ctx: CoachContext) => string | null;
}

export type EffortFn = (lm: PoseLandmark[]) => number;

export interface ExerciseDefinition {
  id: string;
  name: string;
  rehabFocus: string;
  /** 'reach' games gate scoring on form; 'rep' games count repetitions. */
  mode: 'reach' | 'rep';
  /** Primary effort metric — increases as the therapeutic movement is performed. */
  effort: EffortFn;

  // Rep detection thresholds, expressed in activation space (0..1).
  engageThreshold: number;
  repThreshold: number;
  releaseThreshold: number;
  minHoldMs: number;
  /** Activation units/sec above which the movement is flagged as uncontrolled. */
  maxRepVelocity: number;

  // Compensation gating.
  checkTrunkLean: boolean;
  checkAsymmetry: boolean;
  maxTrunkLeanDeg: number;
  maxAsymmetry: number;

  coachRules: CoachRule[];

  calibration: {
    neutralPrompt: string;
    maxPrompt: string;
  };
}

export interface GameRegistration {
  id: string;
  exercise: ExerciseDefinition;
  createScene: () => import('../engine/Scene').Scene;
}

export type { PoseData };
