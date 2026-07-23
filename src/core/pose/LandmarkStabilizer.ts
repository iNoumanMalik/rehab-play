import type { PoseLandmark, LandmarkDebugInfo, BoneDebugInfo, StabilizerDebugState } from '../../types';

/**
 * Swap-prone symmetric landmark pairs — checked independently rather than as
 * one "arm swapped" decision, since a crossed wrist doesn't imply the elbow
 * crossed too (e.g. clapping in front of the chest with elbows still apart).
 */
const SWAP_PAIRS: [number, number][] = [
  [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22],
  [23, 24], [25, 26], [27, 28], [29, 30], [31, 32],
];

/** proximal -> distal bone chains, corrected in that order so a bad wrist reading can't drag its elbow along with it. */
const BONE_CHAINS: { label: string; proximal: number; distal: number }[] = [
  { label: 'leftUpperArm', proximal: 11, distal: 13 },
  { label: 'leftForearm', proximal: 13, distal: 15 },
  { label: 'rightUpperArm', proximal: 12, distal: 14 },
  { label: 'rightForearm', proximal: 14, distal: 16 },
  { label: 'leftThigh', proximal: 23, distal: 25 },
  { label: 'leftShin', proximal: 25, distal: 27 },
  { label: 'rightThigh', proximal: 24, distal: 26 },
  { label: 'rightShin', proximal: 26, distal: 28 },
];

const DEBUG_LABELS: Record<number, string> = {
  11: 'leftShoulder', 12: 'rightShoulder',
  13: 'leftElbow', 14: 'rightElbow',
  15: 'leftWrist', 16: 'rightWrist',
  23: 'leftHip', 24: 'rightHip',
};

/**
 * Hysteresis band for the "is this landmark actually seen" decision. A single
 * fixed threshold isn't enough: when a body part is only extrapolated (e.g.
 * hips below the camera's crop), MediaPipe's own visibility score hovers and
 * flickers around the threshold rather than sitting cleanly above or below
 * it — which flips the trust decision back and forth, occasionally admitting
 * a fresh (bad) raw guess right before freezing again. That flicker is what
 * reads as the skeleton "snapping" to an anatomically impossible pose. A gap
 * between the enter/exit thresholds means one noisy sample can't flip it.
 */
const ENTER_TRUST_VISIBILITY = 0.6;
const EXIT_TRUST_VISIBILITY = 0.4;
/** Normalized units/sec ceiling. Generous enough for a fast clap (~2-3 u/s); catches implausible single-frame teleports. */
const MAX_SPEED = 8;
/** The swapped assignment must be a clearly better match (>=30% lower cost), not just marginally, to avoid flip-flopping on noise. */
const SWAP_WIN_MARGIN = 0.7;
const BONE_MIN_RATIO = 0.5;
const BONE_MAX_RATIO = 1.6;
const BONE_REF_EMA_ALPHA = 0.02;

interface StableEntry {
  x: number;
  y: number;
  z: number;
  time: number;
}

function dist3(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * Stabilizes raw MediaPipe landmarks before they reach the One-Euro smoother
 * (JointSmoother). Handles failure modes that produce an unstable or
 * anatomically-impossible skeleton:
 *
 * 1. MediaPipe occasionally flips its left/right assignment for a symmetric
 *    pair when they're near each other (clapping, crossed arms), producing a
 *    huge one-frame "jump" that's actually just a relabeling, not real motion.
 * 2. A landmark that's out of frame or occluded isn't really observed at all
 *    — MediaPipe still emits a plausible-looking extrapolated guess for it,
 *    with a visibility score that hovers/flickers rather than sitting
 *    cleanly low. Trusting it (or flip-flopping trust on it frame to frame)
 *    is what produces "shoulder connects to the wrong hip" style artifacts.
 * 3. A single bad frame can teleport a joint an implausible distance.
 *
 * Left uncaught, any of these corrupts the One-Euro filter's velocity
 * estimate (which drives its adaptive cutoff) and shows up downstream as
 * vibration or snapping. `enforceBoneLengths` runs *after* smoothing as a
 * final geometric safety net against compress/stretch artifacts.
 *
 * The output `visibility` is the single source of truth for "should this be
 * drawn/used" — untrusted landmarks are reported at 0 regardless of their raw
 * score, so every downstream consumer's existing `visibility >= threshold`
 * gate (MotionOverlay's skeleton renderer, wrist trails, etc.) automatically
 * hides them without needing its own copy of this logic.
 */
export class LandmarkStabilizer {
  private stable: Map<number, StableEntry> = new Map();
  private trusted: Map<number, boolean> = new Map();
  private boneRef: Map<string, number> = new Map();
  private debugLandmarks: LandmarkDebugInfo[] = [];
  private debugBones: BoneDebugInfo[] = [];

  /** Swap-correct, confidence-gate, and speed-clamp raw landmarks. Feed the result into a JointSmoother. */
  stabilize(raw: PoseLandmark[], timestampMs: number): PoseLandmark[] {
    const working = raw.map(lm => ({ ...lm }));
    const swappedSet = new Set<number>();

    for (const [a, b] of SWAP_PAIRS) {
      if (a >= working.length || b >= working.length) continue;
      // Only swap-check pairs that were both already trustworthy — there's
      // nothing meaningful to reconcile against for a landmark that's never
      // actually been seen.
      if (!this.trusted.get(a) || !this.trusted.get(b)) continue;
      const prevA = this.stable.get(a);
      const prevB = this.stable.get(b);
      if (!prevA || !prevB) continue;
      const rawA = working[a];
      const rawB = working[b];
      const costSame = dist3(rawA, prevA) + dist3(rawB, prevB);
      const costSwap = dist3(rawA, prevB) + dist3(rawB, prevA);
      if (costSwap < costSame * SWAP_WIN_MARGIN) {
        working[a] = rawB;
        working[b] = rawA;
        swappedSet.add(a);
        swappedSet.add(b);
      }
    }

    const debugLandmarks: LandmarkDebugInfo[] = [];
    const output = working.map((lm, i) => {
      const rawVisibility = lm.visibility ?? 1;
      const wasTrusted = this.trusted.get(i) ?? false;
      // Hysteresis: needs a confidently-high reading to *become* trusted, but
      // only drops below a confidently-low reading to stop being trusted.
      const nowTrusted = wasTrusted ? rawVisibility >= EXIT_TRUST_VISIBILITY : rawVisibility >= ENTER_TRUST_VISIBILITY;
      this.trusted.set(i, nowTrusted);

      const prev = this.stable.get(i);
      let x = lm.x, y = lm.y, z = lm.z;
      let frozen = false;
      let clamped = false;

      if (!nowTrusted) {
        // Hold at the last trusted position if we have one; otherwise this
        // landmark has literally never been confidently observed, so its
        // raw guess is meaningless — output visibility 0 either way below.
        if (prev) { x = prev.x; y = prev.y; z = prev.z; }
        frozen = true;
      } else if (prev) {
        const dt = Math.max(0.001, (timestampMs - prev.time) / 1000);
        const d = dist3({ x, y, z }, prev);
        const speed = d / dt;
        if (speed > MAX_SPEED && d > 0) {
          const t = (MAX_SPEED * dt) / d;
          x = prev.x + (x - prev.x) * t;
          y = prev.y + (y - prev.y) * t;
          z = prev.z + (z - prev.z) * t;
          clamped = true;
        }
      }

      // Only advance the "stable" reference position while trusted — a held
      // position shouldn't overwrite itself with a fresh timestamp forever,
      // it should keep pointing at the last real observation. The one
      // exception is the very first sighting of a landmark: anchor there
      // immediately even if untrusted, so a persistently-unseen landmark
      // (e.g. hips below the crop) holds steady instead of continuously
      // feeding fresh raw noise into the One-Euro filter while hidden.
      if (nowTrusted || !prev) this.stable.set(i, { x, y, z, time: timestampMs });

      if (DEBUG_LABELS[i]) {
        debugLandmarks.push({ index: i, label: DEBUG_LABELS[i], visibility: nowTrusted ? rawVisibility : 0, frozen, clamped, swapped: swappedSet.has(i) });
      }

      return { x, y, z, visibility: nowTrusted ? rawVisibility : 0 };
    });

    this.debugLandmarks = debugLandmarks;
    return output;
  }

  /**
   * Rescales distal joints back onto a plausible bone-length range, working
   * proximal-out (shoulder->elbow before elbow->wrist) so one bad joint can't
   * distort the next. The tolerance band (0.5x-1.6x a slowly-learned
   * reference length) is deliberately wide — a limb rotating toward the
   * camera legitimately foreshortens in 2D, and this must not fight that.
   * It only reins in the extreme snaps that are the actual bug.
   */
  enforceBoneLengths(landmarks: PoseLandmark[], opts: { learn: boolean; recordDebug?: boolean } = { learn: true }): PoseLandmark[] {
    if (landmarks.length < 33) return landmarks;
    const out = landmarks.map(lm => ({ ...lm }));
    const bones: BoneDebugInfo[] = [];

    for (const { label, proximal, distal } of BONE_CHAINS) {
      const p = out[proximal];
      const d = out[distal];
      if (!p || !d) continue;
      const length = dist3(p, d) || 1e-6;
      const visOk = (p.visibility ?? 0) >= EXIT_TRUST_VISIBILITY && (d.visibility ?? 0) >= EXIT_TRUST_VISIBILITY;

      let ref = this.boneRef.get(label);
      if (ref == null) {
        if (!visOk) continue; // don't bootstrap a reference length from an untrusted/phantom joint
        ref = length;
        this.boneRef.set(label, ref);
      } else if (opts.learn && visOk) {
        ref = ref * (1 - BONE_REF_EMA_ALPHA) + length * BONE_REF_EMA_ALPHA;
        this.boneRef.set(label, ref);
      }

      const ratio = length / ref;
      let corrected = false;
      if (visOk && (ratio < BONE_MIN_RATIO || ratio > BONE_MAX_RATIO)) {
        const clampedLength = Math.min(Math.max(length, BONE_MIN_RATIO * ref), BONE_MAX_RATIO * ref);
        const t = clampedLength / length;
        out[distal] = { ...d, x: p.x + (d.x - p.x) * t, y: p.y + (d.y - p.y) * t, z: p.z + (d.z - p.z) * t };
        corrected = true;
      }
      bones.push({ label, ratio, corrected });
    }

    if (opts.recordDebug !== false) this.debugBones = bones;
    return out;
  }

  getDebugState(): StabilizerDebugState {
    return { landmarks: this.debugLandmarks, bones: this.debugBones };
  }

  reset(): void {
    this.stable.clear();
    this.trusted.clear();
    this.boneRef.clear();
    this.debugLandmarks = [];
    this.debugBones = [];
  }
}
