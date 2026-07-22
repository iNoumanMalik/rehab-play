import type { PoseData, PoseLandmark } from '../../types';
import { LANDMARK } from '../../types';
import { Scene, type SceneState } from '../../core/engine/Scene';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { AmbientField } from '../../core/engine/AmbientField';
import { safe, danger } from '../../core/engine/palette';
import { upperBodyTracked, torsoLength } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

/** Signed lean read directly off the torso, in torso-length units (unitless, both axes comparable). */
function trunkLean(lm: PoseLandmark[]): { lateral: number; forwardBack: number } {
  const lSh = lm[LANDMARK.LEFT_SHOULDER], rSh = lm[LANDMARK.RIGHT_SHOULDER];
  const lHip = lm[LANDMARK.LEFT_HIP], rHip = lm[LANDMARK.RIGHT_HIP];
  const shoulderMid = { x: (lSh.x + rSh.x) / 2, z: (lSh.z + rSh.z) / 2 };
  const hipMid = { x: (lHip.x + rHip.x) / 2, z: (lHip.z + rHip.z) / 2 };
  const torso = torsoLength(lm);
  return {
    // Screen-space sign (mirror-corrected): + = leaning toward screen-right.
    lateral: -(shoulderMid.x - hipMid.x) / torso,
    // + = leaning forward (shoulders closer to the camera than the hips).
    forwardBack: (hipMid.z - shoulderMid.z) / torso,
  };
}

function leanMagnitude(lm: PoseLandmark[]): number {
  const { lateral, forwardBack } = trunkLean(lm);
  return Math.hypot(lateral, forwardBack);
}

export const tiltMazeExercise: ExerciseDefinition = {
  id: 'tilt-maze',
  name: 'Tilt Maze',
  rehabFocus: 'Core stability, weight-shifting & trunk control',
  mode: 'reach',
  effort: leanMagnitude,
  engageThreshold: 0.08,
  repThreshold: 0.65,
  releaseThreshold: 0.2,
  minHoldMs: 0,
  maxRepVelocity: 20,
  // Leaning IS the steering input here, not a compensation to flag.
  checkTrunkLean: false,
  checkAsymmetry: false,
  maxTrunkLeanDeg: 90,
  maxAsymmetry: 2,
  coachRules: [
    { id: 'start', severity: 'cue', test: (c) => (c.activation < 0.1 ? 'Lean gently to roll the ball' : null) },
  ],
  calibration: {
    // Deliberately posture-agnostic — sitting or standing both calibrate correctly,
    // since what's captured is each player's own comfortable lean range, not a fixed angle.
    neutralPrompt: 'Sit or stand tall, centered and relaxed — this can be seated if you prefer',
    maxPrompt: 'Lean as far as feels comfortable to one side — this sets your steering range',
  },
};

interface Wall { x: number; y: number; w: number; h: number; }
interface Pit { x: number; y: number; r: number; }
interface MazeLevel {
  name: string;
  walls: Wall[];
  pits: Pit[];
  start: { x: number; y: number };
  goal: { x: number; y: number; r: number };
}

// Coordinates normalised 0..1; x by canvas width, y by canvas height.
// y=1 (south) is the player's near side, y=0 (north/"forward") is the goal —
// leaning forward rolls the ball north, matching a tabletop labyrinth tilted away from you.
const LEVELS: MazeLevel[] = [
  {
    name: 'Open Field',
    walls: [
      { x: 0.08, y: 0.46, w: 0.34, h: 0.055 },
      { x: 0.58, y: 0.46, w: 0.34, h: 0.055 },
    ],
    pits: [],
    start: { x: 0.5, y: 0.86 },
    goal: { x: 0.5, y: 0.12, r: 0.07 },
  },
  {
    name: 'S-Curve',
    walls: [
      { x: 0.0, y: 0.62, w: 0.62, h: 0.05 },
      { x: 0.38, y: 0.34, w: 0.62, h: 0.05 },
    ],
    pits: [{ x: 0.18, y: 0.48, r: 0.055 }],
    start: { x: 0.5, y: 0.88 },
    goal: { x: 0.5, y: 0.1, r: 0.07 },
  },
  {
    name: 'Zigzag',
    walls: [
      { x: 0.0, y: 0.7, w: 0.6, h: 0.045 },
      { x: 0.4, y: 0.48, w: 0.6, h: 0.045 },
      { x: 0.0, y: 0.26, w: 0.6, h: 0.045 },
    ],
    pits: [{ x: 0.78, y: 0.58, r: 0.05 }, { x: 0.22, y: 0.36, r: 0.05 }],
    start: { x: 0.5, y: 0.9 },
    goal: { x: 0.5, y: 0.08, r: 0.065 },
  },
  {
    name: 'Chicane',
    walls: [
      { x: 0.12, y: 0.74, w: 0.5, h: 0.045 },
      { x: 0.62, y: 0.52, w: 0.3, h: 0.28 },
      { x: 0.08, y: 0.3, w: 0.5, h: 0.045 },
    ],
    pits: [{ x: 0.32, y: 0.6, r: 0.05 }, { x: 0.72, y: 0.2, r: 0.05 }],
    start: { x: 0.5, y: 0.9 },
    goal: { x: 0.15, y: 0.1, r: 0.065 },
  },
  {
    name: 'Gauntlet',
    walls: [
      { x: 0.0, y: 0.78, w: 0.58, h: 0.04 },
      { x: 0.42, y: 0.58, w: 0.58, h: 0.04 },
      { x: 0.0, y: 0.38, w: 0.58, h: 0.04 },
      { x: 0.42, y: 0.18, w: 0.58, h: 0.04 },
    ],
    pits: [{ x: 0.78, y: 0.68, r: 0.045 }, { x: 0.2, y: 0.48, r: 0.045 }, { x: 0.78, y: 0.28, r: 0.045 }],
    start: { x: 0.5, y: 0.92 },
    goal: { x: 0.5, y: 0.06, r: 0.06 },
  },
];

const START_LIVES = 3;
const MAX_SPEED_FRAC = 0.5; // fraction of canvas height per second, at full calibrated lean
const RESPONSE_RATE = 5; // how fast velocity approaches its target
const BALL_R_FRAC = 0.026;
const BASE_ADVANCE_FRAC = 0.075; // guaranteed baseline northward creep, fraction of height/sec
const MIN_ADVANCE_FRAC = 0.045; // floor on northward speed — leaning back can only slow it down to this

/**
 * A tabletop-labyrinth feel: lateral lean freely steers left/right, while the
 * ball always creeps toward the goal on its own — forward lean speeds that up,
 * leaning back slows it toward a floor, but it never fully stops or reverses.
 * That keeps every goal reachable through dodging + patience alone even for
 * players whose forward/back lean barely registers, while still rewarding
 * players who lean forward to push through faster.
 */
export class TiltMazeScene extends Scene {
  private levelIdx = 0;
  private ball = { x: 0, y: 0, vx: 0, vy: 0 };
  private lives = START_LIVES;
  private cleanRun = true;
  private score = 0;
  private elapsed = 0;
  private levelStartedAt = 0;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private successPulse = false;
  private respawnFlash = 0;
  private particles = new ParticleSystem();
  private ambient = new AmbientField({ kind: 'mote', colors: ['#4FC3F7', '#80DEEA', '#B39DDB'], count: 14, maxAlpha: 0.3 });

  init(width: number, height: number): void {
    super.init(width, height);
    this.resetBallToStart();
  }

  private level(): MazeLevel { return LEVELS[Math.min(this.levelIdx, LEVELS.length - 1)]; }

  private resetBallToStart(): void {
    const lvl = this.level();
    this.ball = { x: lvl.start.x * this.width, y: lvl.start.y * this.height, vx: 0, vy: 0 };
    this.levelStartedAt = this.elapsed;
  }

  update(dt: number, frame: ExerciseFrame, pose: PoseData | null): void {
    this.elapsed += dt;
    this.ambient.update(dt, this.width, this.height);
    this.successPulse = false;
    this.respawnFlash = Math.max(0, this.respawnFlash - dt * 2);
    if (this.over) { this.particles.update(dt); return; }
    this.feedback = [];

    const lm = pose?.smoothLandmarks ?? [];
    const tracked = upperBodyTracked(lm);
    let steerX = 0, leanBoostY = 0;
    if (tracked) {
      const { lateral, forwardBack } = trunkLean(lm);
      const rawMag = Math.hypot(lateral, forwardBack);
      const ratio = rawMag > 1e-4 ? frame.activation / rawMag : 0;
      steerX = Math.max(-1.4, Math.min(1.4, lateral * ratio));
      // Forward lean (+forwardBack) should roll the ball north (screen y decreases).
      leanBoostY = Math.max(-1.4, Math.min(1.4, -forwardBack * ratio));
    } else {
      this.feedback = ['Step back so your shoulders and hips are both visible'];
    }

    const maxSpeed = this.height * MAX_SPEED_FRAC;
    const lvl = this.level();
    const targetVx = steerX * maxSpeed;
    // The ball always creeps north toward the goal on its own — forward/back
    // lean only speeds this up or slows it down (never reverses it past a
    // guaranteed minimum). Depth-from-a-single-camera lean is inherently the
    // noisiest signal we have, so the goal must stay reachable by lateral
    // dodging + patience alone even if that axis reads as flat zero all game.
    const baseVy = -this.height * BASE_ADVANCE_FRAC;
    let targetVy = baseVy + leanBoostY * maxSpeed * 0.6;
    targetVy = Math.min(targetVy, -this.height * MIN_ADVANCE_FRAC);
    targetVy = Math.max(targetVy, -maxSpeed * 1.15);
    const ease = Math.min(1, dt * RESPONSE_RATE);
    this.ball.vx += (targetVx - this.ball.vx) * ease;
    this.ball.vy += (targetVy - this.ball.vy) * ease;
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    const ballR = Math.min(this.width, this.height) * BALL_R_FRAC;
    this.ball.x = Math.max(ballR, Math.min(this.width - ballR, this.ball.x));
    // The one-way auto-advance above must never carry the ball PAST the goal
    // — since it can only ever move north, overshooting would strand it
    // beyond the goal with no way back. Treat "just past the goal" as a soft
    // floor so the ball settles inside the goal's reach and waits for lateral
    // alignment, instead of sailing on to the screen edge.
    const goalStopY = (lvl.goal.y - lvl.goal.r * 0.5) * this.height;
    const minY = Math.max(ballR, goalStopY);
    this.ball.y = Math.max(minY, Math.min(this.height - ballR, this.ball.y));

    for (const w of lvl.walls) {
      const rx = w.x * this.width, ry = w.y * this.height, rw = w.w * this.width, rh = w.h * this.height;
      const closestX = Math.max(rx, Math.min(this.ball.x, rx + rw));
      const closestY = Math.max(ry, Math.min(this.ball.y, ry + rh));
      const dx = this.ball.x - closestX, dy = this.ball.y - closestY;
      const dist = Math.hypot(dx, dy);
      if (dist < ballR && dist > 1e-5) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = ballR - dist;
        this.ball.x += nx * overlap;
        this.ball.y += ny * overlap;
        const vn = this.ball.vx * nx + this.ball.vy * ny;
        if (vn < 0) { this.ball.vx -= vn * nx * 1.2; this.ball.vy -= vn * ny * 1.2; }
      }
    }

    for (const p of lvl.pits) {
      const px = p.x * this.width, py = p.y * this.height, pr = p.r * this.height;
      if (Math.hypot(this.ball.x - px, this.ball.y - py) < pr * 0.65) {
        this.cleanRun = false;
        this.lives--;
        this.respawnFlash = 1;
        audioManager.playHit();
        this.particles.emitBurst(this.ball.x, this.ball.y, { color: '#5D4037', colors: ['#3E2723', '#6D4C41'], count: 16, speed: 90, gravity: 60 });
        if (this.lives <= 0) {
          this.over = true;
          audioManager.playGameOver();
        } else {
          this.resetBallToStart();
        }
        break;
      }
    }

    if (!this.over) {
      const gx = lvl.goal.x * this.width, gy = lvl.goal.y * this.height, gr = lvl.goal.r * this.height;
      if (Math.hypot(this.ball.x - gx, this.ball.y - gy) < gr) {
        const timeBonus = Math.max(0, Math.round(30 - (this.elapsed - this.levelStartedAt)));
        this.score += 100 + timeBonus + (this.cleanRun ? 50 : 0);
        this.successPulse = true;
        this.particles.emitBurst(gx, gy, { colors: ['#FFD740', '#69F0AE', '#4FC3F7', '#FF8A65'], count: 26, speed: 150, lifetime: 0.9 });
        if (this.levelIdx < LEVELS.length - 1) {
          this.levelIdx++;
          this.cleanRun = true;
          audioManager.playLevelUp();
          this.resetBallToStart();
        } else {
          this.over = true; this.won = true;
          audioManager.playVictory();
        }
      }
    }

    this.particles.update(dt);
  }

  private drawWall(ctx: CanvasRenderingContext2D, w: Wall): void {
    const rx = w.x * this.width, ry = w.y * this.height, rw = w.w * this.width, rh = w.h * this.height;
    ctx.fillStyle = '#5C4033';
    Renderer.roundedRect(ctx, rx, ry, rw, rh, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawPit(ctx: CanvasRenderingContext2D, p: Pit): void {
    const px = p.x * this.width, py = p.y * this.height, pr = p.r * this.height;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, pr);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(1, '#3E2723');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  render(ctx: CanvasRenderingContext2D): void {
    Renderer.clear(ctx, this.width, this.height);
    Renderer.drawVignette(ctx, this.width, this.height, '#0d1b24', 0.42);
    this.ambient.render(ctx);
    const lvl = this.level();

    for (const p of lvl.pits) this.drawPit(ctx, p);

    const gx = lvl.goal.x * this.width, gy = lvl.goal.y * this.height, gr = lvl.goal.r * this.height;
    const pulse = Math.sin(this.elapsed * 3) * 0.15 + 1;
    Renderer.drawGlow(ctx, gx, gy, gr * 1.6 * pulse, safe());
    ctx.strokeStyle = safe(); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(gx, gy, gr * 0.75, 0, Math.PI * 2); ctx.stroke();
    Renderer.drawText(ctx, '🏁', gx, gy, { size: gr, align: 'center', baseline: 'middle' });

    for (const w of lvl.walls) this.drawWall(ctx, w);

    const ballR = Math.min(this.width, this.height) * BALL_R_FRAC;
    if (this.respawnFlash > 0.01) Renderer.drawGlow(ctx, this.ball.x, this.ball.y, ballR * 3, danger());
    Renderer.drawGlow(ctx, this.ball.x, this.ball.y, ballR * 2, '#64B5F6');
    const grad = ctx.createRadialGradient(this.ball.x - ballR * 0.3, this.ball.y - ballR * 0.3, 0, this.ball.x, this.ball.y, ballR);
    grad.addColorStop(0, '#E3F2FD');
    grad.addColorStop(1, '#1976D2');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, ballR, 0, Math.PI * 2); ctx.fill();

    this.particles.render(ctx);

    // Kept below the DOM HUD strip AND the ObjectiveBanner (top ~12-98px);
    // the feedback text is left to the shared FeedbackOverlay, not duplicated here.
    Renderer.drawHudBand(ctx, this.width, 96, 66);
    Renderer.drawText(ctx, `Score: ${this.score}`, 16, 108, { size: 18, align: 'left' });
    Renderer.drawText(ctx, lvl.name, this.width - 16, 108, { size: 13, align: 'right', color: '#88ccff' });
    Renderer.drawText(ctx, '❤️'.repeat(Math.max(0, this.lives)), this.width / 2, 136, { size: 16, align: 'center' });
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.levelIdx, reps: 0,
      combo: 0, multiplier: 1, maxCombo: 0,
      level: this.levelIdx + 1, accuracy: 100,
      feedback: this.feedback, over: this.over, won: this.won,
      health: { current: this.lives, max: START_LIVES },
      objective: 'Lean left/right to dodge — lean forward to speed toward the flag',
      guidance: null,
      successPulse: this.successPulse,
    };
  }
}

export const tiltMazeGame: GameRegistration = {
  id: 'tilt-maze',
  exercise: tiltMazeExercise,
  createScene: () => new TiltMazeScene(),
};
