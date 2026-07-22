import type { PoseData } from '../../types';
import { Scene, type SceneState } from '../../core/engine/Scene';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { ComboSystem } from '../../core/engine/ComboSystem';
import { LevelManager } from '../../core/engine/LevelManager';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { AmbientField } from '../../core/engine/AmbientField';
import { assets, drawSprite } from '../../core/assets/AssetSystem';
import { fruitSvg } from '../../core/assets/sprites';
import { danger, warn } from '../../core/engine/palette';
import { reachExtension, wristToScreen, upperBodyTracked } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

export const fruitSliceExercise: ExerciseDefinition = {
  id: 'fruit-slice',
  name: 'Fruit Slice',
  rehabFocus: 'Lateral reach, swipe control & shoulder mobility',
  mode: 'reach',
  effort: (lm) => Math.max(reachExtension(lm, 'left'), reachExtension(lm, 'right')),
  engageThreshold: 0.24,
  repThreshold: 0.8,
  releaseThreshold: 0.3,
  minHoldMs: 0,
  // Swiping is supposed to be fast — never flag it as uncontrolled.
  maxRepVelocity: 40,
  // A full swing naturally rotates the torso — don't gate the slice on it,
  // just keep a generous ceiling for genuinely excessive whole-body lean.
  checkTrunkLean: true,
  checkAsymmetry: false,
  maxTrunkLeanDeg: 40,
  maxAsymmetry: 1,
  coachRules: [
    { id: 'lean', severity: 'warn', test: (c) => (c.compensations.find(x => x.id === 'trunk-lean')?.label ?? null) },
    { id: 'reach', severity: 'cue', test: (c) => (c.activation < 0.2 ? 'Swipe your arm fully across the frame' : null) },
  ],
  calibration: {
    neutralPrompt: 'Rest your hands close to your body',
    maxPrompt: 'Swing one arm fully out to the side, as far as you can reach',
  },
};

type FruitType = 'apple' | 'orange' | 'banana' | 'grape' | 'strawberry';
const FRUIT_TYPES: FruitType[] = ['apple', 'orange', 'banana', 'grape', 'strawberry'];
const FRUIT_COLORS: Record<FruitType, string> = {
  apple: '#FF4444', orange: '#FF9800', banana: '#FFEB3B', grape: '#9C27B0', strawberry: '#E91E63',
};

interface Piece {
  x: number; y: number; vx: number; vy: number;
  type: FruitType; isBomb: boolean; size: number;
  rot: number; rotSpeed: number;
  sliced: boolean; slicedAt: number; active: boolean; id: number;
}
interface FloatingText { x: number; y: number; text: string; color: string; life: number; }
interface TrailPoint { x: number; y: number; life: number; }

const GRAVITY = 620;
const SWIPE_MIN_SPEED = 260; // px/sec — a real swipe, not a drift
const SLICES_PER_LEVEL = 12;
const HAND_SIDES = ['left', 'right'] as const;

/** Shortest distance from point (px,py) to segment (x1,y1)-(x2,y2). */
function segPointDist(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq)) : 0;
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Fruit Ninja energy: fruit and bombs arc up under gravity and the player
 * slices them by swiping a hand THROUGH them fast enough (segment-vs-circle
 * test on the wrist's frame-to-frame trail), not just touching. Gated on
 * calibrated reach so a genuine, full-arm swipe is required — a tiny flick of
 * the wrist won't register.
 */
export class FruitSliceScene extends Scene {
  private pieces: Piece[] = [];
  private texts: FloatingText[] = [];
  private trails: Record<'left' | 'right', TrailPoint[]> = { left: [], right: [] };
  private prevHand: Record<'left' | 'right', { x: number; y: number } | null> = { left: null, right: null };
  private particles = new ParticleSystem();
  private combo = new ComboSystem();
  private levelMgr = new LevelManager();
  private score = 0;
  private success = 0;
  private attempts = 0;
  private slicesThisLevel = 0;
  private health = 100;
  private elapsed = 0;
  private lastSpawn = 0;
  private nextId = 1;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private successPulse = false;
  private ambient = new AmbientField({ kind: 'mote', colors: ['#FFB74D', '#69F0AE', '#4FC3F7'], count: 16, maxAlpha: 0.35 });

  update(dt: number, frame: ExerciseFrame, pose: PoseData | null): void {
    this.elapsed += dt;
    this.ambient.update(dt, this.width, this.height);
    this.successPulse = false;
    if (this.over) { this.particles.update(dt); return; }
    this.combo.update(dt);
    this.feedback = [];

    const cfg = this.levelMgr.getConfig();
    if (this.elapsed - this.lastSpawn > cfg.spawnRate * 0.65 && this.pieces.filter(p => p.active).length < cfg.entityLimit) {
      this.spawn();
      this.lastSpawn = this.elapsed;
    }

    const lm = pose?.predictedLandmarks ?? [];
    const tracked = upperBodyTracked(lm);
    const leaning = frame.compensations.some(c => c.id === 'trunk-lean');

    const hands: Record<'left' | 'right', { x: number; y: number } | null> = { left: null, right: null };
    if (tracked) {
      for (const side of HAND_SIDES) hands[side] = wristToScreen(lm, side, this.width, this.height);
    }

    // Build swipe segments (previous → current) and update blade trails.
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number; speed: number }> = [];
    for (const side of HAND_SIDES) {
      const cur = hands[side];
      const prev = this.prevHand[side];
      if (cur) {
        this.trails[side].push({ x: cur.x, y: cur.y, life: 0.22 });
        // Leaning is only a soft coaching cue here — a real swing rotates the
        // torso, so hard-blocking on it would silently eat almost every slice.
        // Swipe speed alone is the "genuine effort" gate.
        if (prev) {
          const segLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
          const speed = segLen / Math.max(dt, 1e-4);
          if (speed > SWIPE_MIN_SPEED) segments.push({ x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, speed });
        }
      }
      this.prevHand[side] = cur;
      const trail = this.trails[side];
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].life -= dt;
        if (trail[i].life <= 0) trail.splice(i, 1);
      }
    }
    if (leaning) this.feedback = ['Swipe with your arm, not by leaning'];

    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (!p.active) { this.pieces.splice(i, 1); continue; }
      if (p.sliced) {
        if (this.elapsed - p.slicedAt > 0.45) this.pieces.splice(i, 1);
        continue;
      }

      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;

      if (p.y - p.size > this.height + 40) {
        p.active = false;
        if (!p.isBomb) {
          this.attempts++;
          this.combo.registerMiss();
          this.health = Math.max(0, this.health - 15);
          if (this.health <= 0) { this.over = true; audioManager.playGameOver(); }
        }
        continue;
      }

      const hitRadius = p.size * 0.85;
      let sliced = false;
      for (const seg of segments) {
        if (segPointDist(seg.x1, seg.y1, seg.x2, seg.y2, p.x, p.y) < hitRadius) { sliced = true; break; }
      }
      if (!sliced) continue;

      p.sliced = true; p.slicedAt = this.elapsed;
      this.attempts++;

      if (p.isBomb) {
        this.combo.registerMiss();
        this.health = Math.max(0, this.health - 25);
        this.score = Math.max(0, this.score - 20);
        audioManager.playHit();
        this.particles.emitBurst(p.x, p.y, { color: '#ff4444', colors: ['#333', '#ff7043', '#ffca28'], count: 16, speed: 140 });
        this.pushText(p.x, p.y, 'BOOM', danger());
        if (this.health <= 0) { this.over = true; audioManager.playGameOver(); }
        continue;
      }

      const mult = this.combo.registerHit();
      const points = Math.round(10 * mult);
      this.score += points;
      this.success++;
      this.slicesThisLevel++;
      this.successPulse = true;
      audioManager.playCollect();
      if (mult > 1) audioManager.playCombo();
      this.particles.emitBurst(p.x, p.y, { color: FRUIT_COLORS[p.type], count: 14, speed: 130, lifetime: 0.5 });
      this.pushText(p.x, p.y, `+${points}`, '#69F0AE');

      if (this.slicesThisLevel >= SLICES_PER_LEVEL) {
        this.slicesThisLevel = 0;
        if (this.levelMgr.currentLevel < this.levelMgr.maxLevel) {
          this.levelMgr.nextLevel();
          audioManager.playLevelUp();
        } else {
          this.over = true; this.won = true; audioManager.playVictory();
        }
      }
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].life -= dt;
      this.texts[i].y -= dt * 34;
      if (this.texts[i].life <= 0) this.texts.splice(i, 1);
    }
    this.particles.update(dt);
  }

  private pushText(x: number, y: number, text: string, color: string): void {
    this.texts.push({ x, y, text, color, life: 0.6 });
  }

  private spawn(): void {
    const speedMul = this.levelMgr.getSpeedMultiplier();
    const bombChance = 0.1 + this.levelMgr.currentLevel * 0.03;
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const isBomb = Math.random() < bombChance;
      const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      const x = this.width * (0.2 + Math.random() * 0.6);
      this.pieces.push({
        x, y: this.height + 50,
        vx: (Math.random() - 0.5) * 140,
        vy: -(560 + Math.random() * 180) * (0.85 + speedMul * 0.3),
        type, isBomb, size: 46 + Math.random() * 12,
        rot: 0, rotSpeed: (Math.random() - 0.5) * 3,
        sliced: false, slicedAt: 0, active: true, id: this.nextId++,
      });
    }
  }

  private drawBlade(ctx: CanvasRenderingContext2D): void {
    for (const side of HAND_SIDES) {
      const pts = this.trails[side];
      if (pts.length < 2) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const alpha = Math.max(0, Math.min(1, b.life / 0.22)) * 0.8;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5 * alpha + 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawPiece(ctx: CanvasRenderingContext2D, p: Piece): void {
    const alpha = p.sliced ? Math.max(0, 1 - (this.elapsed - p.slicedAt) / 0.45) : 1;
    if (p.isBomb) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      Renderer.drawGlow(ctx, 0, 0, p.size * 1.1, '#EF5350');
      ctx.fillStyle = '#212121';
      ctx.beginPath(); ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(-p.size * 0.12, -p.size * 0.14, p.size * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.size * 0.2, -p.size * 0.36); ctx.quadraticCurveTo(p.size * 0.4, -p.size * 0.6, p.size * 0.3, -p.size * 0.75); ctx.stroke();
      const spark = 0.5 + Math.sin(this.elapsed * 20) * 0.5;
      Renderer.drawCircle(ctx, p.size * 0.32, -p.size * 0.78, 4 + spark * 3, '#FFD740');
      ctx.restore();
      return;
    }

    const img = assets.getOrCreate(`fruit:${p.type}`, () => fruitSvg(p.type));
    if (img) {
      if (p.sliced) {
        // Two halves drift apart along the slice axis for a satisfying "cut" beat.
        const off = (this.elapsed - p.slicedAt) * 60;
        drawSprite(ctx, img, p.x - off, p.y - off * 0.2, p.size, p.rot - 0.3, alpha);
        drawSprite(ctx, img, p.x + off, p.y + off * 0.2, p.size, p.rot + 0.3, alpha);
      } else {
        drawSprite(ctx, img, p.x, p.y, p.size, p.rot, alpha);
      }
    } else {
      ctx.globalAlpha = alpha;
      Renderer.drawCircle(ctx, p.x, p.y, p.size / 2.2, FRUIT_COLORS[p.type]);
      ctx.globalAlpha = 1;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    Renderer.clear(ctx, this.width, this.height);
    Renderer.drawVignette(ctx, this.width, this.height, '#160c1f', 0.42);
    this.ambient.render(ctx);

    for (const p of this.pieces) this.drawPiece(ctx, p);
    this.drawBlade(ctx);
    this.particles.render(ctx);

    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / 0.6);
      Renderer.drawText(ctx, t.text, t.x, t.y, { size: 18, align: 'center', baseline: 'middle', color: t.color });
      ctx.globalAlpha = 1;
    }

    // Kept below the DOM HUD strip AND the ObjectiveBanner (top ~12-98px,
    // the banner can stretch wide) so canvas text never sits under those;
    // combo is shown by the shared ComboDisplay overlay, not duplicated here.
    Renderer.drawHudBand(ctx, this.width, 96, 48);
    Renderer.drawText(ctx, `Score: ${this.score}`, 16, 108, { size: 18, align: 'left' });
    Renderer.drawText(ctx, `Level ${this.levelMgr.currentLevel}`, this.width - 16, 108, { size: 13, align: 'right', color: '#88ccff' });
    Renderer.drawProgressBar(ctx, this.width / 2 - 60, 110, 120, 8, this.slicesThisLevel / SLICES_PER_LEVEL, warn());
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.success, reps: 0,
      combo: this.combo.combo, multiplier: this.combo.getMultiplier(), maxCombo: this.combo.maxCombo,
      level: this.levelMgr.currentLevel,
      accuracy: this.attempts ? Math.round((this.success / this.attempts) * 100) : 100,
      feedback: this.feedback, over: this.over, won: this.won,
      health: { current: this.health, max: 100 },
      objective: 'Swipe through fruit — avoid the bombs!',
      guidance: null,
      successPulse: this.successPulse,
    };
  }
}

export const fruitSliceGame: GameRegistration = {
  id: 'fruit-slice',
  exercise: fruitSliceExercise,
  createScene: () => new FruitSliceScene(),
};
