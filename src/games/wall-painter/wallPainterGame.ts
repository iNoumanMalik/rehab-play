import type { PoseData, PoseLandmark } from '../../types';
import { Scene, type SceneState } from '../../core/engine/Scene';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { AmbientField } from '../../core/engine/AmbientField';
import { shoulderElevation, reachExtension, wristToScreen, upperBodyTracked, handHitRadius } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

// Combines vertical elevation and lateral extension into one reach magnitude,
// so calibration captures whichever direction the player actually moves in.
function shoulderReach(lm: PoseLandmark[], side: 'left' | 'right'): number {
  return Math.hypot(shoulderElevation(lm, side), reachExtension(lm, side) - 0.3);
}

export const wallPainterExercise: ExerciseDefinition = {
  id: 'wall-painter',
  name: 'Wall Painter',
  rehabFocus: 'Full shoulder range of motion — reach, carry & place',
  mode: 'reach',
  effort: (lm) => Math.max(shoulderReach(lm, 'left'), shoulderReach(lm, 'right')),
  engageThreshold: 0.16,
  repThreshold: 0.7,
  releaseThreshold: 0.25,
  minHoldMs: 200,
  maxRepVelocity: 12,
  checkTrunkLean: true,
  checkAsymmetry: false,
  maxTrunkLeanDeg: 24,
  maxAsymmetry: 1,
  coachRules: [
    { id: 'lean', severity: 'warn', test: (c) => (c.compensations.find(x => x.id === 'trunk-lean')?.label ?? null) },
    { id: 'hold', severity: 'cue', test: (c) => (c.activation > 0.1 && c.activation < 0.4 ? 'Reach further and hold — no need to rush' : null) },
  ],
  calibration: {
    neutralPrompt: 'Relax with your arms down at your sides',
    maxPrompt: 'Reach one arm up and out, as far as you comfortably can',
  },
};

type Channel = 'r' | 'y' | 'b';
type Mix = Record<Channel, number>;
const CHANNELS: Channel[] = ['r', 'y', 'b'];
const CHANNEL_COLOR: Record<Channel, string> = { r: '#E53935', y: '#FDD835', b: '#1E88E5' };
const CHANNEL_RGB: Record<Channel, [number, number, number]> = { r: [229, 57, 53], y: [253, 216, 53], b: [30, 136, 229] };
const CHANNEL_NAME: Record<Channel, string> = { r: 'Red', y: 'Yellow', b: 'Blue' };

/** Average the pure channel colours weighted by their share of the mix — an empty canvas reads as neutral grey. */
function blendColor(mix: Mix): string {
  const total = mix.r + mix.y + mix.b;
  if (total < 0.03) return '#33313d';
  let r = 0, g = 0, b = 0;
  for (const c of CHANNELS) {
    const w = mix[c] / total;
    const [rr, gg, bb] = CHANNEL_RGB[c];
    r += rr * w; g += gg * w; b += bb * w;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

interface Well { channel: Channel; cx: number; cy: number; }
// Fixed across levels so players learn the map; spread wide (overhead corners
// + a low centre reach) so simply fetching pigment is itself a full-ROM rep.
const WELLS: Well[] = [
  { channel: 'r', cx: 0.12, cy: 0.16 },
  { channel: 'y', cx: 0.88, cy: 0.16 },
  { channel: 'b', cx: 0.5, cy: 0.93 },
];

interface TargetDef { cx: number; cy: number; target: Mix; }
interface LevelDef { name: string; tolerance: number; targets: TargetDef[]; }
interface Target extends TargetDef { mix: Mix; done: boolean; }

// `target` is a composition (fractions summing to ~1), not an absolute amount —
// matched against each canvas's own current ratio, not raw volume.
const LEVELS: LevelDef[] = [
  {
    name: 'Warm-Up', tolerance: 0.28,
    targets: [
      { cx: 0.3, cy: 0.42, target: { r: 0.85, y: 0.08, b: 0.07 } },
      { cx: 0.7, cy: 0.42, target: { r: 0.07, y: 0.08, b: 0.85 } },
    ],
  },
  {
    name: 'Secondary Colors', tolerance: 0.24,
    targets: [
      { cx: 0.22, cy: 0.36, target: { r: 0.48, y: 0.04, b: 0.48 } }, // purple
      { cx: 0.5, cy: 0.58, target: { r: 0.48, y: 0.48, b: 0.04 } }, // orange
      { cx: 0.78, cy: 0.36, target: { r: 0.04, y: 0.48, b: 0.48 } }, // green
    ],
  },
  {
    name: 'Balancing Act', tolerance: 0.2,
    targets: [
      { cx: 0.18, cy: 0.48, target: { r: 0.4, y: 0.3, b: 0.3 } },
      { cx: 0.4, cy: 0.3, target: { r: 0.2, y: 0.6, b: 0.2 } },
      { cx: 0.62, cy: 0.48, target: { r: 0.3, y: 0.2, b: 0.5 } },
      { cx: 0.82, cy: 0.3, target: { r: 0.5, y: 0.2, b: 0.3 } },
    ],
  },
  {
    name: 'Fine Mixing', tolerance: 0.17,
    targets: [
      { cx: 0.2, cy: 0.34, target: { r: 0.35, y: 0.35, b: 0.3 } },
      { cx: 0.42, cy: 0.58, target: { r: 0.15, y: 0.5, b: 0.35 } },
      { cx: 0.64, cy: 0.34, target: { r: 0.3, y: 0.15, b: 0.55 } },
      { cx: 0.82, cy: 0.58, target: { r: 0.5, y: 0.25, b: 0.25 } },
    ],
  },
  {
    name: 'Master Palette', tolerance: 0.15,
    targets: [
      { cx: 0.16, cy: 0.46, target: { r: 0.33, y: 0.34, b: 0.33 } },
      { cx: 0.34, cy: 0.28, target: { r: 0.6, y: 0.2, b: 0.2 } },
      { cx: 0.5, cy: 0.58, target: { r: 0.2, y: 0.6, b: 0.2 } },
      { cx: 0.66, cy: 0.28, target: { r: 0.2, y: 0.2, b: 0.6 } },
      { cx: 0.84, cy: 0.46, target: { r: 0.25, y: 0.25, b: 0.5 } },
    ],
  },
];

const WELL_R_FRAC = 0.075;
const TARGET_R_FRAC = 0.09;
const LOAD_RATE = 0.5; // carried amount filled per second, holding at a well
const DEPOSIT_RATE = 0.42; // carried amount spent per second, holding at a canvas
const SIPHON_RATE = 0.32; // per second, lifting paint back out of an over-mixed canvas
const CHANNEL_MAX = 1.6;
const MIN_TOTAL = 0.85; // a canvas must hold at least this much ink before its ratio counts

/**
 * Color Transfer Puzzle: reach a paint well to load a pure colour into a
 * shared "carried paint" reservoir, then carry it to a canvas and hold to mix
 * it in. Holding an EMPTY hand over a canvas instead siphons its most
 * dominant colour back out, so overshooting one channel is always fixable —
 * carry it away, or dilute it by adding the colours it's missing. Matching is
 * against each canvas's own colour RATIO, not a raw fill amount, so simply
 * dumping one colour forever never wins: the player has to plan a sequence of
 * trips across genuinely different reach positions (a bilateral, wide-ROM
 * problem to solve), not just hold still over one spot.
 */
export class WallPainterScene extends Scene {
  private levelIdx = 0;
  private targets: Target[] = [];
  private loadedColor: Channel | null = null;
  private loadedAmount = 0;
  private lastHands: { x: number; y: number }[] = [];
  private particles = new ParticleSystem();
  private score = 0;
  private totalCompleted = 0;
  private elapsed = 0;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private successPulse = false;
  private guidance: { x: number; y: number } | null = null;
  private ambient = new AmbientField({ kind: 'petal', colors: ['#F48FB1', '#CE93D8', '#80DEEA', '#FFCC80'], count: 18, maxAlpha: 0.3 });

  constructor() {
    super();
    this.loadLevel(0);
  }

  private level(): LevelDef { return LEVELS[Math.min(this.levelIdx, LEVELS.length - 1)]; }

  private loadLevel(idx: number): void {
    this.targets = LEVELS[idx].targets.map(t => ({ ...t, mix: { r: 0, y: 0, b: 0 }, done: false }));
  }

  update(dt: number, frame: ExerciseFrame, pose: PoseData | null): void {
    this.elapsed += dt;
    this.ambient.update(dt, this.width, this.height);
    this.successPulse = false;
    if (this.over) { this.particles.update(dt); return; }
    this.feedback = [];

    const lm = pose?.predictedLandmarks ?? [];
    const tracked = upperBodyTracked(lm);
    const leaning = frame.compensations.some(c => c.id === 'trunk-lean');
    const hands = tracked
      ? [wristToScreen(lm, 'left', this.width, this.height), wristToScreen(lm, 'right', this.width, this.height)]
      : [];
    const radius = tracked ? handHitRadius(lm, this.height, 0.5) : 0;
    // A soft penalty, not a hard block — reaching to a corner well naturally
    // involves some torso lean, and fully gating on it would just make
    // stations feel broken (the lesson from Fruit Slice's swipe gate).
    const effFactor = leaning ? 0.5 : 1;
    this.lastHands = hands;
    if (leaning) this.feedback = ['Reach with your arm, not by leaning your torso'];

    for (const well of WELLS) {
      const px = well.cx * this.width, py = well.cy * this.height;
      if (hands.some(hd => Math.hypot(hd.x - px, hd.y - py) < radius + WELL_R_FRAC * this.height)) {
        if (this.loadedColor !== well.channel) { this.loadedColor = well.channel; this.loadedAmount = 0; }
        this.loadedAmount = Math.min(1, this.loadedAmount + LOAD_RATE * dt * effFactor);
      }
    }

    let nearestTarget: { d: number; x: number; y: number } | null = null;

    for (const t of this.targets) {
      if (t.done) continue;
      const px = t.cx * this.width, py = t.cy * this.height;
      const hit = hands.some(hd => Math.hypot(hd.x - px, hd.y - py) < radius + TARGET_R_FRAC * this.height);

      if (hit && this.loadedAmount > 1e-3 && this.loadedColor) {
        const amt = Math.min(this.loadedAmount, DEPOSIT_RATE * dt);
        this.loadedAmount -= amt;
        t.mix[this.loadedColor] = Math.min(CHANNEL_MAX, t.mix[this.loadedColor] + amt * effFactor);
      } else if (hit) {
        let dominant: Channel = 'r';
        for (const c of CHANNELS) if (t.mix[c] > t.mix[dominant]) dominant = c;
        if (t.mix[dominant] > 0.02) {
          const amt = Math.min(t.mix[dominant], SIPHON_RATE * dt * effFactor);
          t.mix[dominant] = Math.max(0, t.mix[dominant] - amt);
          this.loadedColor = dominant;
          this.loadedAmount = Math.min(1, this.loadedAmount + amt);
        }
      } else {
        const d = hands.length ? Math.min(...hands.map(hd => Math.hypot(hd.x - px, hd.y - py))) : Infinity;
        if (!nearestTarget || d < nearestTarget.d) nearestTarget = { d, x: px, y: py };
      }

      const total = t.mix.r + t.mix.y + t.mix.b;
      if (!t.done && total >= MIN_TOTAL) {
        let error = 0;
        for (const c of CHANNELS) error += Math.abs(t.mix[c] / total - t.target[c]);
        if (error < this.level().tolerance) {
          t.done = true;
          this.totalCompleted++;
          this.score += 100 + this.levelIdx * 15;
          this.successPulse = true;
          audioManager.playCollect();
          this.particles.emitBurst(px, py, { colors: ['#ffffff', blendColor(t.target)], count: 22, speed: 130, lifetime: 0.8 });
        }
      }
    }

    if (this.loadedAmount <= 0.05) {
      let best: { d: number; x: number; y: number } | null = null;
      for (const well of WELLS) {
        const px = well.cx * this.width, py = well.cy * this.height;
        const d = hands.length ? Math.min(...hands.map(hd => Math.hypot(hd.x - px, hd.y - py))) : Infinity;
        if (!best || d < best.d) best = { d, x: px, y: py };
      }
      this.guidance = best && best.d > radius * 1.6 ? { x: best.x, y: best.y } : null;
    } else {
      this.guidance = nearestTarget && nearestTarget.d > radius * 1.6 ? { x: nearestTarget.x, y: nearestTarget.y } : null;
    }

    if (this.targets.length && this.targets.every(t => t.done)) {
      if (this.levelIdx < LEVELS.length - 1) {
        this.levelIdx++;
        this.loadLevel(this.levelIdx);
        audioManager.playLevelUp();
      } else {
        this.over = true; this.won = true; audioManager.playVictory();
      }
    }

    this.particles.update(dt);
  }

  private drawWell(ctx: CanvasRenderingContext2D, well: Well): void {
    const px = well.cx * this.width, py = well.cy * this.height;
    const r = WELL_R_FRAC * this.height;
    const pulse = this.loadedColor === well.channel && this.loadedAmount < 0.98 ? 1 + Math.sin(this.elapsed * 6) * 0.08 : 1;
    Renderer.drawGlow(ctx, px, py, r * 1.6, CHANNEL_COLOR[well.channel]);
    Renderer.drawCircle(ctx, px, py, r * pulse, CHANNEL_COLOR[well.channel]);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, r * pulse, 0, Math.PI * 2); ctx.stroke();
    Renderer.drawText(ctx, well.channel.toUpperCase(), px, py, { size: 20, align: 'center', baseline: 'middle', color: '#fff' });
  }

  private drawRatioBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mix: Mix, alpha: number): void {
    let cx = x;
    ctx.globalAlpha = alpha;
    for (const c of CHANNELS) {
      const total = mix.r + mix.y + mix.b;
      const frac = total > 0 ? mix[c] / total : 1 / 3;
      const segW = w * frac;
      ctx.fillStyle = CHANNEL_COLOR[c];
      ctx.fillRect(cx, y, Math.max(0, segW), h);
      cx += segW;
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  private drawTarget(ctx: CanvasRenderingContext2D, t: Target): void {
    const px = t.cx * this.width, py = t.cy * this.height;
    const r = TARGET_R_FRAC * this.height;
    const total = t.mix.r + t.mix.y + t.mix.b;

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = blendColor(t.target);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, r * 1.18, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    Renderer.drawCircle(ctx, px, py, r, blendColor(t.mix));
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();

    // Fill-progress arc toward the minimum amount needed before ratio counts.
    const fillPct = Math.min(1, total / MIN_TOTAL);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, r * 1.18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fillPct); ctx.stroke();

    const barW = r * 1.7, barH = r * 0.22;
    this.drawRatioBar(ctx, px - barW / 2, py - r * 1.55, barW, barH, t.target, 0.55);
    this.drawRatioBar(ctx, px - barW / 2, py + r * 1.3, barW, barH, t.mix, 1);

    if (t.done) {
      Renderer.drawGlow(ctx, px, py, r * 1.4, blendColor(t.target));
      Renderer.drawText(ctx, '✓', px, py, { size: 26, align: 'center', baseline: 'middle', color: '#fff' });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    Renderer.clear(ctx, this.width, this.height);
    Renderer.drawVignette(ctx, this.width, this.height, '#1a1024', 0.4);
    this.ambient.render(ctx);

    for (const well of WELLS) this.drawWell(ctx, well);
    for (const t of this.targets) this.drawTarget(ctx, t);
    this.particles.render(ctx);

    if (this.loadedAmount > 0.02 && this.loadedColor) {
      for (const hand of this.lastHands) {
        Renderer.drawGlow(ctx, hand.x, hand.y, 14 + this.loadedAmount * 22, CHANNEL_COLOR[this.loadedColor]);
        Renderer.drawCircle(ctx, hand.x, hand.y, 6 + this.loadedAmount * 8, CHANNEL_COLOR[this.loadedColor]);
      }
    }

    // Kept below the DOM HUD strip AND the ObjectiveBanner (top ~12-98px);
    // the "carrying" label is left to the ObjectiveBanner (which already
    // states it) — only the at-a-glance fill gauge is duplicated here.
    const done = this.targets.filter(t => t.done).length;
    Renderer.drawHudBand(ctx, this.width, 96, 48);
    Renderer.drawText(ctx, `Score: ${this.score}`, 16, 108, { size: 18, align: 'left' });
    Renderer.drawText(ctx, this.level().name, this.width - 16, 108, { size: 13, align: 'right', color: '#88ccff' });
    Renderer.drawText(ctx, `${done}/${this.targets.length} matched`, this.width / 2, 108, { size: 13, align: 'center', color: '#ccc' });

    if (this.loadedColor) {
      Renderer.drawProgressBar(ctx, this.width / 2 - 50, 132, 100, 5, this.loadedAmount, CHANNEL_COLOR[this.loadedColor]);
    }
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.totalCompleted, reps: 0,
      combo: 0, multiplier: 1, maxCombo: 0,
      level: this.levelIdx + 1, accuracy: 100,
      feedback: this.feedback, over: this.over, won: this.won,
      objective: this.loadedAmount <= 0.05
        ? 'Reach a paint well to load color — or an empty hand over a canvas siphons extra off'
        : `Carrying ${this.loadedColor ? CHANNEL_NAME[this.loadedColor] : ''} — carry it to a canvas that needs it`,
      guidance: this.guidance,
      successPulse: this.successPulse,
    };
  }
}

export const wallPainterGame: GameRegistration = {
  id: 'wall-painter',
  exercise: wallPainterExercise,
  createScene: () => new WallPainterScene(),
};
