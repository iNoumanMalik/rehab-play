import type { PoseData } from '../../types';
import { LANDMARK } from '../../types';
import { landmarkToScreen } from '../exercise/metrics';
import { safe, warn, danger } from './palette';

interface Point { x: number; y: number; }

export interface MotionOverlayInput {
  pose: PoseData | null;
  tracked: boolean;
  /** 0..1 rolling movement/posture quality — drives joint & outline colour. */
  quality: number;
  compensating: boolean;
  /** Optional on-screen point to guide the player toward (e.g. nearest target). */
  guidance: Point | null;
  /** Set true for exactly one frame when a rep/catch is validated — triggers the success flash. */
  successPulse: boolean;
}

interface TrailPoint extends Point { life: number; }

const BONES: [number, number][] = [
  [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_ELBOW],
  [LANDMARK.LEFT_ELBOW, LANDMARK.LEFT_WRIST],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_ELBOW],
  [LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_WRIST],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP],
  [LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP],
];
const JOINTS = [
  LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_ELBOW, LANDMARK.RIGHT_ELBOW,
  LANDMARK.LEFT_WRIST, LANDMARK.RIGHT_WRIST,
  LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP,
];
const TRAIL_LIFE = 0.45;
const MIN_VIS = 0.35;

/**
 * Renders the player's own body as a living part of the game: a soft glowing
 * skeleton, hand trails that spark with motion, a posture halo, a directional
 * guidance arc toward the current objective, and a full-screen success flash.
 * This is drawn on top of whatever Scene is active — the same overlay works
 * for every game, so the "your movement is part of the game" feel is uniform.
 */
export class MotionOverlay {
  private leftTrail: TrailPoint[] = [];
  private rightTrail: TrailPoint[] = [];
  private t = 0;
  private flashStrength = 0;
  private reducedMotion = false;

  setReducedMotion(v: boolean): void { this.reducedMotion = v; }

  private qualityColor(q: number): string {
    if (q > 0.75) return safe();
    if (q > 0.4) return warn();
    return danger();
  }

  update(dt: number, input: MotionOverlayInput, w: number, h: number): void {
    this.t += dt;
    if (input.successPulse) this.flashStrength = 1;
    this.flashStrength = Math.max(0, this.flashStrength - dt * 1.8);

    const lm = input.pose?.predictedLandmarks ?? [];
    const pushTrail = (trail: TrailPoint[], idx: number) => {
      for (const p of trail) p.life -= dt;
      while (trail.length && trail[0].life <= 0) trail.shift();
      if (input.tracked && (lm[idx]?.visibility ?? 1) >= MIN_VIS) {
        const p = landmarkToScreen(lm, idx, w, h);
        trail.push({ x: p.x, y: p.y, life: this.reducedMotion ? TRAIL_LIFE * 0.4 : TRAIL_LIFE });
      }
    };
    pushTrail(this.leftTrail, LANDMARK.LEFT_WRIST);
    pushTrail(this.rightTrail, LANDMARK.RIGHT_WRIST);
  }

  render(ctx: CanvasRenderingContext2D, input: MotionOverlayInput, w: number, h: number): void {
    const lm = input.pose?.predictedLandmarks ?? [];
    const color = this.qualityColor(input.quality);
    const visible = (i: number) => (lm[i]?.visibility ?? 0) >= MIN_VIS;

    if (input.tracked && lm.length) {
      this.renderOutline(ctx, lm, w, h, color);
      this.renderSkeleton(ctx, lm, w, h, color, visible);
      this.renderTrail(ctx, this.leftTrail, color);
      this.renderTrail(ctx, this.rightTrail, color);
      this.renderJoints(ctx, lm, w, h, color, visible);
    }

    if (input.guidance) this.renderGuidance(ctx, w, h, input.guidance);
    if (this.flashStrength > 0.01) this.renderSuccessFlash(ctx, w, h);
  }

  private renderOutline(ctx: CanvasRenderingContext2D, lm: import('../../types').PoseLandmark[], w: number, h: number, color: string): void {
    const pts = [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP, LANDMARK.LEFT_HIP]
      .map(i => landmarkToScreen(lm, i, w, h));
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderSkeleton(ctx: CanvasRenderingContext2D, lm: import('../../types').PoseLandmark[], w: number, h: number, color: string, visible: (i: number) => boolean): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.5;
    for (const [a, b] of BONES) {
      if (!visible(a) || !visible(b)) continue;
      const pa = landmarkToScreen(lm, a, w, h);
      const pb = landmarkToScreen(lm, b, w, h);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderJoints(ctx: CanvasRenderingContext2D, lm: import('../../types').PoseLandmark[], w: number, h: number, color: string, visible: (i: number) => boolean): void {
    // Whichever wrist has the longer/faster trail right now reads as the "active" limb.
    const activeIsLeft = this.leftTrail.length >= this.rightTrail.length;

    for (const idx of JOINTS) {
      if (!visible(idx)) continue;
      const p = landmarkToScreen(lm, idx, w, h);
      const isWrist = idx === LANDMARK.LEFT_WRIST || idx === LANDMARK.RIGHT_WRIST;
      const isActiveWrist = isWrist && ((idx === LANDMARK.LEFT_WRIST) === activeIsLeft);
      // Fixed radius, no pulsing — a continuous per-joint size oscillation
      // here reads as "the tracking is unstable/vibrating", not as a nice
      // effect, which actively undermines trust in a rehab tool. Real
      // movement is already visible via the joint's own position changing.
      const r = isWrist ? (isActiveWrist ? 11 : 8) : 6;

      ctx.save();
      ctx.globalAlpha = isWrist ? 0.9 : 0.55;
      ctx.shadowColor = color;
      ctx.shadowBlur = isActiveWrist ? 22 : 12;
      ctx.fillStyle = isActiveWrist ? '#ffffff' : color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], color: string): void {
    if (trail.length < 2) return;
    ctx.save();
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      const alpha = Math.max(0, b.life / TRAIL_LIFE) * 0.55;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 + alpha * 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderGuidance(ctx: CanvasRenderingContext2D, w: number, h: number, target: Point): void {
    const leftP = this.leftTrail[this.leftTrail.length - 1];
    const rightP = this.rightTrail[this.rightTrail.length - 1];
    const from = leftP && rightP
      ? (Math.hypot(leftP.x - target.x, leftP.y - target.y) < Math.hypot(rightP.x - target.x, rightP.y - target.y) ? leftP : rightP)
      : leftP ?? rightP ?? { x: w / 2, y: h / 2 };

    const dx = target.x - from.x, dy = target.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 40) return; // already there — no need to point at it

    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(this.t * 6) * 0.15;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 10]);
    ctx.lineDashOffset = -this.t * 40;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const pulse = 14 + Math.sin(this.t * 5) * 4;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderSuccessFlash(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.globalAlpha = this.flashStrength * 0.28;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#ffffff00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  reset(): void {
    this.leftTrail = [];
    this.rightTrail = [];
    this.flashStrength = 0;
    this.t = 0;
  }
}
