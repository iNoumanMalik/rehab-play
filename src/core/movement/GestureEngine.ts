import type { PoseData } from '../../types';
import { LANDMARK } from '../../types';
import { reachExtension, torsoLength, upperBodyTracked, wristToScreen } from '../exercise';
import { settingsStore } from '../services/SettingsStore';

export type HandSide = 'left' | 'right';

/**
 * Per-frame multi-movement read of the player's upper body. All signed values
 * are expressed in SCREEN space (the mirrored view the player sees): positive
 * lean / yaw means "toward the right side of the screen".
 */
export interface GestureFrame {
  tracked: boolean;
  /** Crosshair position (screen px) — the more-extended hand. */
  aim: { x: number; y: number } | null;
  aimSide: HandSide;
  /** Raw reach extension of the aiming arm (torso units, ~0.3 rest → ~1.6 full). */
  reach: number;
  /** Push impulses that fired THIS frame (fast forward/outward extension). */
  pushes: HandSide[];
  /** Both arms pushed within a short window — the "ultimate" gesture. */
  doublePush: boolean;
  /** Which hand is currently reaching across the body midline, if any. */
  crossBody: HandSide | null;
  /** How many wrists are raised above head level (0, 1 or 2). */
  overheadCount: 0 | 1 | 2;
  /** Seconds both arms have been continuously overhead. */
  overheadHoldSec: number;
  /** Signed trunk lean in degrees; + = leaning toward screen-right. */
  leanDeg: number;
  /** Head yaw -1..1; + = looking toward screen-right. */
  headYaw: number;
  /** Head tilted back / chin up (looking toward the top of the screen). */
  lookUp: boolean;
  /** Angular speed of the fastest circling wrist (rad/s). */
  rotationSpeed: number;
  /** Cumulative full arm circles this session (either arm). */
  rotationTurns: number;
}

const PUSH_VELOCITY = 2.6; // torso-units/sec of extension growth
const PUSH_MIN_REACH = 0.55; // must actually be extended, not a twitch
const PUSH_COOLDOWN_SEC = 0.4;
const DOUBLE_PUSH_WINDOW_SEC = 0.3;
const CROSS_ENTER = 0.06; // torso-normalised distance past the far shoulder
const CROSS_EXIT = 0.0;
const YAW_CLAMP = 1.5;
const LOOKUP_ENTER = 0.32; // nose above ear line, in ear-distance units
const LOOKUP_EXIT = 0.18;
const ROTATION_MIN_RADIUS = 0.42; // arm must be lifted away from the body
const ROTATION_MAX_STEP_RAD = 1.4; // ignore tracking jumps
const AIM_SWITCH_MARGIN = 0.1; // the other arm must clearly overtake, not just edge past, to switch aim hands

const EMPTY: GestureFrame = {
  tracked: false, aim: null, aimSide: 'right', reach: 0, pushes: [], doublePush: false,
  crossBody: null, overheadCount: 0, overheadHoldSec: 0, leanDeg: 0, headYaw: 0,
  lookUp: false, rotationSpeed: 0, rotationTurns: 0,
};

interface ArmTrack {
  prevExt: number;
  velocity: number; // EMA-smoothed extension velocity
  cooldown: number;
  lastPushAt: number;
  prevAngle: number | null;
  angularSpeed: number; // EMA-smoothed |rad/s|
  turnAccum: number; // accumulated |radians| of circling
}

function newArm(): ArmTrack {
  return { prevExt: 0, velocity: 0, cooldown: 0, lastPushAt: -10, prevAngle: null, angularSpeed: 0, turnAccum: 0 };
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Turns pose landmarks into discrete, forgiving gameplay gestures. Continuous
 * signals (lean, yaw, reach) are read straight off the already-one-euro-smoothed
 * landmarks; event gestures (push, double push) use velocity thresholds with
 * cooldowns; state gestures (cross-body, overhead, look-up, aim side) use
 * hysteresis so jitter at the boundary never flickers them.
 */
export class GestureEngine {
  private elapsed = 0;
  private arms: Record<HandSide, ArmTrack> = { left: newArm(), right: newArm() };
  private crossState: HandSide | null = null;
  private lookUpState = false;
  private overheadHold = 0;
  private turns = 0;
  private aimSideState: HandSide = 'right';

  reset(): void {
    this.elapsed = 0;
    this.arms = { left: newArm(), right: newArm() };
    this.crossState = null;
    this.lookUpState = false;
    this.overheadHold = 0;
    this.turns = 0;
    this.aimSideState = 'right';
  }

  update(dt: number, pose: PoseData | null, canvasW: number, canvasH: number): GestureFrame {
    this.elapsed += dt;
    const lm = pose?.smoothLandmarks ?? [];
    const predicted = pose?.predictedLandmarks ?? lm;
    if (!pose || !upperBodyTracked(lm) || dt <= 0) {
      // Keep accumulated state (turns, hold) but report nothing actionable.
      return { ...EMPTY, rotationTurns: this.turns };
    }

    const torso = torsoLength(lm);
    const nose = lm[LANDMARK.NOSE];
    const lEar = lm[LANDMARK.LEFT_EAR];
    const rEar = lm[LANDMARK.RIGHT_EAR];
    const lSh = lm[LANDMARK.LEFT_SHOULDER];
    const rSh = lm[LANDMARK.RIGHT_SHOULDER];
    const lWr = lm[LANDMARK.LEFT_WRIST];
    const rWr = lm[LANDMARK.RIGHT_WRIST];
    const hipMid = {
      x: (lm[LANDMARK.LEFT_HIP].x + lm[LANDMARK.RIGHT_HIP].x) / 2,
      y: (lm[LANDMARK.LEFT_HIP].y + lm[LANDMARK.RIGHT_HIP].y) / 2,
    };
    const shoulderMid = { x: (lSh.x + rSh.x) / 2, y: (lSh.y + rSh.y) / 2 };

    // --- Reach + aim -----------------------------------------------------
    const extL = reachExtension(lm, 'left');
    const extR = reachExtension(lm, 'right');
    // Dominant-arm personalization only resolves near-ties (a small bias) —
    // a clearly-more-extended arm always wins regardless of preference, so
    // aiming still feels responsive to whichever arm the player actually moved.
    // Hysteresis (AIM_SWITCH_MARGIN) keeps this sticky to whichever hand is
    // already aiming — without it, ordinary pose-tracking jitter is enough to
    // flip the aim hand back and forth even when only one arm is moving.
    const dominantArm = settingsStore.get().dominantArm;
    const bias = dominantArm === 'right' ? 0.04 : dominantArm === 'left' ? -0.04 : 0;
    const rightScore = extR + bias;
    if (this.aimSideState === 'right') {
      if (extL > rightScore + AIM_SWITCH_MARGIN) this.aimSideState = 'left';
    } else {
      if (rightScore > extL + AIM_SWITCH_MARGIN) this.aimSideState = 'right';
    }
    const aimSide: HandSide = this.aimSideState;
    const reach = Math.max(extL, extR);
    const aimPt = wristToScreen(predicted, aimSide, canvasW, canvasH);

    // --- Push impulses ---------------------------------------------------
    const pushes: HandSide[] = [];
    for (const side of ['left', 'right'] as const) {
      const arm = this.arms[side];
      const ext = side === 'left' ? extL : extR;
      const rawVel = (ext - arm.prevExt) / dt;
      arm.velocity = arm.velocity * 0.6 + rawVel * 0.4;
      arm.prevExt = ext;
      arm.cooldown = Math.max(0, arm.cooldown - dt);
      if (arm.velocity > PUSH_VELOCITY && ext > PUSH_MIN_REACH && arm.cooldown <= 0) {
        arm.cooldown = PUSH_COOLDOWN_SEC;
        arm.lastPushAt = this.elapsed;
        pushes.push(side);
      }
    }
    const doublePush =
      pushes.length > 0 &&
      Math.abs(this.arms.left.lastPushAt - this.arms.right.lastPushAt) <= DOUBLE_PUSH_WINDOW_SEC &&
      Math.max(this.arms.left.lastPushAt, this.arms.right.lastPushAt) === this.elapsed;

    // --- Cross-body reach (hand past the opposite shoulder) ---------------
    // bodyDir: sign of (right shoulder x − left shoulder x) in landmark space,
    // so the test is orientation-agnostic (works however MediaPipe hands us x).
    const bodyDir = Math.sign(rSh.x - lSh.x) || 1;
    const leftCrossAmt = ((lWr.x - rSh.x) * bodyDir) / torso;
    const rightCrossAmt = ((lSh.x - rWr.x) * bodyDir) / torso;
    if (this.crossState === null) {
      if (leftCrossAmt > CROSS_ENTER) this.crossState = 'left';
      else if (rightCrossAmt > CROSS_ENTER) this.crossState = 'right';
    } else if (this.crossState === 'left' && leftCrossAmt < CROSS_EXIT) {
      this.crossState = null;
    } else if (this.crossState === 'right' && rightCrossAmt < CROSS_EXIT) {
      this.crossState = null;
    }

    // --- Overhead --------------------------------------------------------
    const headY = nose.y;
    const overheadCount = ((lWr.y < headY ? 1 : 0) + (rWr.y < headY ? 1 : 0)) as 0 | 1 | 2;
    this.overheadHold = overheadCount === 2 ? this.overheadHold + dt : 0;

    // --- Trunk lean (signed, screen space) --------------------------------
    const leanRad = Math.atan2(shoulderMid.x - hipMid.x, Math.max(1e-4, hipMid.y - shoulderMid.y));
    const leanDeg = -leanRad * (180 / Math.PI); // mirror → screen space

    // --- Head yaw / look up ------------------------------------------------
    const earMid = { x: (lEar.x + rEar.x) / 2, y: (lEar.y + rEar.y) / 2 };
    const earDist = Math.max(0.02, Math.hypot(lEar.x - rEar.x, lEar.y - rEar.y));
    const yawRaw = (nose.x - earMid.x) / earDist;
    const headYaw = Math.max(-YAW_CLAMP, Math.min(YAW_CLAMP, -yawRaw * 2)); // mirror + gain
    const pitchUp = (earMid.y - nose.y) / earDist;
    if (!this.lookUpState && pitchUp > LOOKUP_ENTER) this.lookUpState = true;
    else if (this.lookUpState && pitchUp < LOOKUP_EXIT) this.lookUpState = false;

    // --- Circular arm rotation --------------------------------------------
    let rotationSpeed = 0;
    for (const side of ['left', 'right'] as const) {
      const arm = this.arms[side];
      const sh = side === 'left' ? lSh : rSh;
      const wr = side === 'left' ? lWr : rWr;
      const radius = Math.hypot(wr.x - sh.x, wr.y - sh.y) / torso;
      const angle = Math.atan2(wr.y - sh.y, wr.x - sh.x);
      if (radius >= ROTATION_MIN_RADIUS && arm.prevAngle !== null) {
        const step = Math.abs(wrapAngle(angle - arm.prevAngle));
        if (step < ROTATION_MAX_STEP_RAD) {
          arm.angularSpeed = arm.angularSpeed * 0.7 + (step / dt) * 0.3;
          // Only count deliberate circling, not incidental drift.
          if (arm.angularSpeed > 1.1) arm.turnAccum += step;
        }
      } else {
        arm.angularSpeed *= 0.85;
      }
      arm.prevAngle = radius >= ROTATION_MIN_RADIUS ? angle : null;
      rotationSpeed = Math.max(rotationSpeed, arm.angularSpeed);
    }
    this.turns = Math.floor((this.arms.left.turnAccum + this.arms.right.turnAccum) / (Math.PI * 2));

    return {
      tracked: true,
      aim: aimPt,
      aimSide,
      reach,
      pushes,
      doublePush,
      crossBody: this.crossState,
      overheadCount,
      overheadHoldSec: this.overheadHold,
      leanDeg,
      headYaw,
      lookUp: this.lookUpState,
      rotationSpeed,
      rotationTurns: this.turns,
    };
  }
}
