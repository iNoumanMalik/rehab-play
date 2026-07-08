import type { PoseLandmark } from '../../types';
import { LANDMARK } from '../../types';

interface Vec { x: number; y: number; }

function mid(a: PoseLandmark, b: PoseLandmark): Vec {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Torso length (shoulders→hips midpoints) — used to normalise for body size & camera distance. */
export function torsoLength(lm: PoseLandmark[]): number {
  const shoulders = mid(lm[LANDMARK.LEFT_SHOULDER], lm[LANDMARK.RIGHT_SHOULDER]);
  const hips = mid(lm[LANDMARK.LEFT_HIP], lm[LANDMARK.RIGHT_HIP]);
  return Math.max(0.05, dist(shoulders, hips));
}

const WRIST = { left: LANDMARK.LEFT_WRIST, right: LANDMARK.RIGHT_WRIST } as const;
const SHOULDER = { left: LANDMARK.LEFT_SHOULDER, right: LANDMARK.RIGHT_SHOULDER } as const;

/**
 * How high the wrist is above the shoulder, normalised by torso length.
 * ~-0.3 arm at side, 0 wrist at shoulder height, ~+1.2 fully overhead.
 * Mirror-agnostic (vertical only).
 */
export function shoulderElevation(lm: PoseLandmark[], side: 'left' | 'right'): number {
  const shoulder = lm[SHOULDER[side]];
  const wrist = lm[WRIST[side]];
  return (shoulder.y - wrist.y) / torsoLength(lm);
}

/** Bilateral overhead effort: the weaker (lower) of the two arms drives the score. */
export function overheadElevation(lm: PoseLandmark[]): number {
  return Math.min(shoulderElevation(lm, 'left'), shoulderElevation(lm, 'right'));
}

/** How far a wrist reaches from its shoulder, normalised by torso length. */
export function reachExtension(lm: PoseLandmark[], side: 'left' | 'right'): number {
  return dist(lm[WRIST[side]], lm[SHOULDER[side]]) / torsoLength(lm);
}

/** Trunk lean from vertical, in degrees (compensation for limited shoulder ROM). */
export function trunkLeanDeg(lm: PoseLandmark[]): number {
  const shoulders = mid(lm[LANDMARK.LEFT_SHOULDER], lm[LANDMARK.RIGHT_SHOULDER]);
  const hips = mid(lm[LANDMARK.LEFT_HIP], lm[LANDMARK.RIGHT_HIP]);
  const dx = shoulders.x - hips.x;
  const dy = hips.y - shoulders.y; // positive: shoulders above hips (upright)
  return Math.abs(Math.atan2(dx, Math.max(1e-4, dy))) * (180 / Math.PI);
}

/** Difference between the two arms' elevation (bilateral asymmetry). */
export function elevationAsymmetry(lm: PoseLandmark[]): number {
  return Math.abs(shoulderElevation(lm, 'left') - shoulderElevation(lm, 'right'));
}

const KEY_UPPER = [
  LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_ELBOW, LANDMARK.RIGHT_ELBOW,
  LANDMARK.LEFT_WRIST, LANDMARK.RIGHT_WRIST,
  LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP,
];

/** Are the upper-body joints visible enough to trust angle/effort metrics? */
export function upperBodyTracked(lm: PoseLandmark[], minVisibility = 0.4): boolean {
  if (lm.length <= LANDMARK.RIGHT_HIP) return false;
  return KEY_UPPER.every(i => (lm[i].visibility ?? 1) >= minVisibility);
}

/** Map a wrist landmark to mirrored on-screen canvas coordinates. */
export function wristToScreen(lm: PoseLandmark[], side: 'left' | 'right', w: number, h: number): Vec {
  const wrist = lm[WRIST[side]];
  return { x: (1 - wrist.x) * w, y: wrist.y * h };
}
