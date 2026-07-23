export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface JointAngles {
  rightElbow: number;
  leftElbow: number;
  rightShoulder: number;
  leftShoulder: number;
  rightHip: number;
  leftHip: number;
  rightKnee: number;
  leftKnee: number;
  trunkAngle: number;
}

export interface MovementData {
  rightWristVelocity: number;
  leftWristVelocity: number;
  rightWristDirection: { dx: number; dy: number };
  leftWristDirection: { dx: number; dy: number };
  rightReachDistance: number;
  leftReachDistance: number;
}

/** Per-frame stabilizer state for one tracked landmark — powers the pose debug panel. */
export interface LandmarkDebugInfo {
  index: number;
  label: string;
  visibility: number;
  /** Held at its previous stable position this frame because visibility dropped below threshold. */
  frozen: boolean;
  /** Raw position moved further than a plausible joint speed allows — step was clamped. */
  clamped: boolean;
  /** This landmark's left/right symmetric pair was swap-corrected this frame. */
  swapped: boolean;
}

/** Per-frame bone-length constraint state for one limb segment — powers the pose debug panel. */
export interface BoneDebugInfo {
  label: string;
  /** current length / learned reference length — 1.0 is "as expected". */
  ratio: number;
  /** true if this segment was rescaled back into its plausible range this frame. */
  corrected: boolean;
}

export interface StabilizerDebugState {
  landmarks: LandmarkDebugInfo[];
  bones: BoneDebugInfo[];
}

export interface PoseData {
  landmarks: PoseLandmark[];
  smoothLandmarks: PoseLandmark[];
  /** smoothLandmarks extrapolated ~80ms ahead to compensate for pipeline latency — use for on-screen hand position / hit-testing. */
  predictedLandmarks: PoseLandmark[];
  angles: JointAngles;
  movement: MovementData;
  feedback: string[];
  confidence: number;
  /** Landmark/bone stabilizer diagnostics — for the pose debug panel. */
  debug?: StabilizerDebugState;
}

export const LANDMARK = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type CoachingLevel = 'perfect' | 'good' | 'needs-work' | 'missing';
