import type { PoseData } from '../../types';
import { Scene, type SceneState } from '../../core/engine/Scene';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { ComboSystem } from '../../core/engine/ComboSystem';
import { LevelManager } from '../../core/engine/LevelManager';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { AmbientField } from '../../core/engine/AmbientField';
import { assets, drawSprite } from '../../core/assets/AssetSystem';
import { butterflySvg, mothSvg } from '../../core/assets/sprites';
import { warn } from '../../core/engine/palette';
import { reachExtension, wristToScreen, upperBodyTracked, handHitRadius } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

export const butterflyExercise: ExerciseDefinition = {
  id: 'butterfly-rescue',
  name: 'Butterfly Rescue',
  rehabFocus: 'Shoulder flexion, lateral reach & hand-eye coordination',
  mode: 'reach',
  effort: (lm) => Math.max(reachExtension(lm, 'left'), reachExtension(lm, 'right')),
  engageThreshold: 0.26,
  repThreshold: 0.8,
  releaseThreshold: 0.35,
  minHoldMs: 100,
  maxRepVelocity: 10,
  checkTrunkLean: true,
  checkAsymmetry: false,
  maxTrunkLeanDeg: 25,
  maxAsymmetry: 1,
  coachRules: [
    { id: 'lean', severity: 'warn', test: (c) => (c.compensations.find(x => x.id === 'trunk-lean')?.label ?? null) },
    { id: 'reach', severity: 'good', test: (c) => (c.activation > 0.7 ? 'Great extension!' : null) },
  ],
  calibration: {
    neutralPrompt: 'Rest your hands close to your body',
    maxPrompt: 'Stretch both arms out as wide as you can',
  },
};

interface Butterfly {
  x: number; y: number; vx: number; vy: number; size: number; color: string;
  isMoth: boolean; wing: number; captureProgress: number; caught: boolean; caughtAt: number; active: boolean;
}

const COLORS = ['#FF6B9D', '#C44DFF', '#6EC6FF', '#69F0AE', '#FFD740', '#FF8A65'];
const CAPTURE_TIME_SEC = 0.55;
const FLOW_GAIN_PER_SEC = 0.55;
const FLOW_DECAY_PER_SEC = 0.3;

function flowMultiplier(flow: number): number {
  if (flow > 0.85) return 3;
  if (flow > 0.6) return 2;
  if (flow > 0.3) return 1.5;
  return 1;
}

/**
 * Flow: a calm, continuous experience (Alto's Adventure energy, not a
 * snap-and-grab game). Butterflies aren't "touched" — they're gently drawn
 * into a soft attraction field around each hand and captured after a moment
 * of sustained, smooth reaching. The field itself grows with how well the
 * player is actually reaching (the exercise engine's calibrated activation),
 * so good therapeutic form is directly rewarded with easier, bigger catches
 * instead of a pass/fail touch test.
 */
export class ButterflyScene extends Scene {
  private bugs: Butterfly[] = [];
  private particles = new ParticleSystem();
  private combo = new ComboSystem();
  private levelMgr = new LevelManager();
  private score = 0;
  private success = 0;
  private health = 100;
  private flow = 0;
  private elapsed = 0;
  private lastSpawn = 0;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private successPulse = false;
  private guidance: { x: number; y: number } | null = null;
  private ambient = new AmbientField({ kind: 'petal', colors: ['#8BC34A', '#C5E1A5', '#F48FB1', '#CE93D8'], count: 20 });

  update(dt: number, frame: ExerciseFrame, pose: PoseData | null): void {
    this.elapsed += dt;
    this.ambient.update(dt, this.width, this.height);
    this.successPulse = false;
    if (this.over) { this.particles.update(dt); return; }
    this.combo.update(dt);
    this.feedback = [];

    const cfg = this.levelMgr.getConfig();
    if (this.elapsed - this.lastSpawn > cfg.spawnRate * 0.7 && this.bugs.filter(b => b.active).length < cfg.entityLimit) {
      this.spawn();
      this.lastSpawn = this.elapsed;
    }

    const lm = pose?.predictedLandmarks ?? [];
    const tracked = upperBodyTracked(lm);
    const hands = tracked
      ? [wristToScreen(lm, 'left', this.width, this.height), wristToScreen(lm, 'right', this.width, this.height)]
      : [];
    const leaning = frame.compensations.some(c => c.id === 'trunk-lean');
    const speedMul = this.levelMgr.getSpeedMultiplier();

    // The field grows with genuine reach quality and with sustained flow —
    // therapeutic effort is directly rewarded with an easier, bigger catch.
    const reachBoost = 0.55 + Math.min(1, frame.activation) * 0.55;
    const flowBoost = 1 + this.flow * 0.4;
    const attractRadius = tracked ? handHitRadius(lm, this.height, 0.55) * reachBoost * flowBoost * (leaning ? 0.5 : 1) : 0;
    const touchRadius = tracked ? handHitRadius(lm, this.height, 0.3) : 0;

    if (tracked && frame.activation >= butterflyExercise.engageThreshold && !leaning) {
      this.flow = Math.min(1, this.flow + FLOW_GAIN_PER_SEC * dt);
    } else {
      this.flow = Math.max(0, this.flow - FLOW_DECAY_PER_SEC * dt);
    }
    if (leaning) this.feedback = ['Reach with your arm, not by leaning'];

    // Passive recovery rewards staying in flow rather than only punishing hits.
    this.health = Math.min(100, this.health + (this.flow > 0.4 ? 3 : 0.4) * dt * 10);

    let nearestGood: { d: number; x: number; y: number } | null = null;

    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i];
      if (!b.active) { this.bugs.splice(i, 1); continue; }
      if (b.caught) { if (this.elapsed - b.caughtAt > 0.5) this.bugs.splice(i, 1); continue; }

      b.wing += dt * 6;
      b.x += (b.vx * speedMul + Math.sin(this.elapsed + b.wing) * 8) * dt;
      b.y += (b.vy * speedMul + Math.cos(this.elapsed * 0.8 + b.wing) * 6) * dt;
      if (b.x < 20 || b.x > this.width - 20) b.vx *= -1;
      if (b.y < 20 || b.y > this.height - 20) b.vy *= -1;

      const nearestHandDist = hands.length
        ? Math.min(...hands.map(h => Math.hypot(b.x - h.x, b.y - h.y)))
        : Infinity;

      if (b.isMoth) {
        if (nearestHandDist < touchRadius) {
          b.caught = true; b.caughtAt = this.elapsed;
          this.health = Math.max(0, this.health - 15);
          this.combo.registerMiss();
          audioManager.playHit();
          this.particles.emitBurst(b.x, b.y, { color: '#ff4444', count: 8, speed: 60 });
          if (this.health <= 0) { this.over = true; audioManager.playGameOver(); }
        }
        continue;
      }

      if (!b.caught && nearestHandDist < attractRadius) {
        b.captureProgress = Math.min(1, b.captureProgress + dt / CAPTURE_TIME_SEC);
        // Gently drawn toward the nearest hand — the "painting with light" feel.
        const hand = hands.reduce((a, h) => (Math.hypot(b.x - h.x, b.y - h.y) < Math.hypot(b.x - a.x, b.y - a.y) ? h : a));
        b.x += (hand.x - b.x) * Math.min(1, dt * 2.5);
        b.y += (hand.y - b.y) * Math.min(1, dt * 2.5);
      } else {
        b.captureProgress = Math.max(0, b.captureProgress - dt * 0.6);
      }

      if (b.captureProgress >= 1) {
        b.caught = true; b.caughtAt = this.elapsed;
        const mult = this.combo.registerHit();
        this.score += Math.round(12 * mult * flowMultiplier(this.flow));
        this.success++;
        this.successPulse = true;
        audioManager.playCollect();
        if (mult > 1) audioManager.playCombo();
        this.particles.emitBurst(b.x, b.y, { color: b.color, count: 14, speed: 90 });
        if (this.success > 0 && this.success % 12 === 0 && this.levelMgr.currentLevel < this.levelMgr.maxLevel) {
          if (this.levelMgr.nextLevel()) audioManager.playLevelUp();
        }
      } else if (!nearestGood || nearestHandDist < nearestGood.d) {
        nearestGood = { d: nearestHandDist, x: b.x, y: b.y };
      }
    }

    this.guidance = nearestGood && nearestGood.d > attractRadius * 1.3 ? { x: nearestGood.x, y: nearestGood.y } : null;
    this.particles.update(dt);
  }

  private spawn(): void {
    const isMoth = Math.random() < 0.16 + this.levelMgr.currentLevel * 0.025;
    const count = isMoth ? 1 : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      this.bugs.push({
        x: 40 + Math.random() * (this.width - 80),
        y: 40 + Math.random() * (this.height - 80),
        vx: (Math.random() - 0.5) * (isMoth ? 90 : 45),
        vy: (Math.random() - 0.5) * (isMoth ? 90 : 45),
        size: isMoth ? 30 + Math.random() * 16 : 34 + Math.random() * 20,
        color: isMoth ? '#8B4513' : COLORS[Math.floor(Math.random() * COLORS.length)],
        isMoth, wing: Math.random() * Math.PI * 2, captureProgress: 0, caught: false, caughtAt: 0, active: true,
      });
    }
  }

  private drawBug(ctx: CanvasRenderingContext2D, b: Butterfly): void {
    const alpha = b.caught ? Math.max(0, 1 - (this.elapsed - b.caughtAt) / 0.5) : 1;
    const rot = Math.sin(this.elapsed * 3 + b.wing) * 0.15;
    const img = b.isMoth
      ? assets.getOrCreate('moth', mothSvg)
      : assets.getOrCreate(`butterfly:${b.color}`, () => butterflySvg(b.color));

    if (!b.isMoth && b.captureProgress > 0.02) {
      Renderer.drawGlow(ctx, b.x, b.y, b.size * 1.4, warn());
      Renderer.drawProgressBar(ctx, b.x - 18, b.y + b.size * 0.7, 36, 4, b.captureProgress, warn());
    }

    if (img) { drawSprite(ctx, img, b.x, b.y, b.size * 1.9, rot, alpha); return; }

    const flap = Math.sin(this.elapsed * 9 + b.wing) * 0.25;
    const s = b.size;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.globalAlpha = alpha;
    if (b.isMoth) {
      ctx.fillStyle = '#5D4037';
      ctx.beginPath(); ctx.ellipse(0, 0, s / 2.5, s / 3, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.ellipse(-s / 4, 0, s / 3, s / 2.5 + Math.abs(flap) * s / 4, flap, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s / 4, 0, s / 3, s / 2.5 + Math.abs(flap) * s / 4, -flap, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  render(ctx: CanvasRenderingContext2D): void {
    Renderer.clear(ctx, this.width, this.height);
    Renderer.drawVignette(ctx, this.width, this.height, '#12240f', 0.4);
    this.ambient.render(ctx);

    for (const b of this.bugs) this.drawBug(ctx, b);
    ctx.globalAlpha = 1;
    this.particles.render(ctx);

    Renderer.drawText(ctx, `Score: ${this.score}`, 16, 12, { size: 18, align: 'left' });
    Renderer.drawText(ctx, `Level ${this.levelMgr.currentLevel}`, 16, this.height - 26, { size: 13, color: '#88ccff', align: 'left' });
    Renderer.drawProgressBar(ctx, this.width - 130, this.height - 26, 110, 6, this.flow, warn());
    Renderer.drawText(ctx, '✨ Flow', this.width - 130, this.height - 38, { size: 11, color: '#ccc', align: 'left' });
    if (this.combo.combo >= 3) {
      Renderer.drawText(ctx, `🔥 ${this.combo.combo}x`, this.width / 2, 12, { size: 17, align: 'center', color: '#FF6B6B' });
    }
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.success, reps: 0,
      combo: this.combo.combo, multiplier: this.combo.getMultiplier(), maxCombo: this.combo.maxCombo,
      level: this.levelMgr.currentLevel, accuracy: 100,
      feedback: this.feedback, over: this.over, won: this.won,
      health: { current: this.health, max: 100 },
      objective: 'Hold butterflies in your glow to rescue them — avoid the moths',
      guidance: this.guidance,
      successPulse: this.successPulse,
    };
  }
}

export const butterflyGame: GameRegistration = {
  id: 'butterfly-rescue',
  exercise: butterflyExercise,
  createScene: () => new ButterflyScene(),
};
