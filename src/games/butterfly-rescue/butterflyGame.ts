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
import { danger, safe } from '../../core/engine/palette';
import { reachExtension, wristToScreen, upperBodyTracked } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

export const butterflyExercise: ExerciseDefinition = {
  id: 'butterfly-rescue',
  name: 'Butterfly Rescue',
  rehabFocus: 'Shoulder flexion, lateral reach & hand-eye coordination',
  mode: 'reach',
  effort: (lm) => Math.max(reachExtension(lm, 'left'), reachExtension(lm, 'right')),
  engageThreshold: 0.3,
  repThreshold: 0.85,
  releaseThreshold: 0.4,
  minHoldMs: 150,
  maxRepVelocity: 8,
  checkTrunkLean: true,
  checkAsymmetry: false,
  maxTrunkLeanDeg: 22,
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
  isMoth: boolean; wing: number; caught: boolean; caughtAt: number; active: boolean;
}

const COLORS = ['#FF6B9D', '#C44DFF', '#6EC6FF', '#69F0AE', '#FFD740', '#FF8A65'];

export class ButterflyScene extends Scene {
  private bugs: Butterfly[] = [];
  private particles = new ParticleSystem();
  private combo = new ComboSystem();
  private levelMgr = new LevelManager();
  private score = 0;
  private success = 0;
  private health = 100;
  private elapsed = 0;
  private lastSpawn = 0;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private ambient = new AmbientField({ kind: 'petal', colors: ['#8BC34A', '#C5E1A5', '#F48FB1', '#CE93D8'], count: 20 });

  update(dt: number, frame: ExerciseFrame, pose: PoseData | null): void {
    this.elapsed += dt;
    this.ambient.update(dt, this.width, this.height);
    if (this.over) { this.particles.update(dt); return; }
    this.combo.update(dt);
    this.feedback = [];

    const cfg = this.levelMgr.getConfig();
    if (this.elapsed - this.lastSpawn > cfg.spawnRate * 0.7 && this.bugs.filter(b => b.active).length < cfg.entityLimit) {
      this.spawn();
      this.lastSpawn = this.elapsed;
    }

    const lm = pose?.smoothLandmarks ?? [];
    const hands = upperBodyTracked(lm)
      ? [wristToScreen(lm, 'left', this.width, this.height), wristToScreen(lm, 'right', this.width, this.height)]
      : [];
    const leaning = frame.compensations.some(c => c.id === 'trunk-lean');
    const speedMul = this.levelMgr.getSpeedMultiplier();

    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i];
      if (!b.active) { this.bugs.splice(i, 1); continue; }
      if (b.caught) { if (this.elapsed - b.caughtAt > 0.5) this.bugs.splice(i, 1); continue; }

      b.wing += dt * 6;
      b.x += (b.vx * speedMul + Math.sin(this.elapsed + b.wing) * 8) * dt;
      b.y += (b.vy * speedMul + Math.cos(this.elapsed * 0.8 + b.wing) * 6) * dt;
      if (b.x < 20 || b.x > this.width - 20) b.vx *= -1;
      if (b.y < 20 || b.y > this.height - 20) b.vy *= -1;

      const touched = hands.some(h => Math.hypot(b.x - h.x, b.y - h.y) < b.size / 2 + 26);
      if (!touched) continue;

      if (b.isMoth) {
        b.caught = true; b.caughtAt = this.elapsed;
        this.health = Math.max(0, this.health - 15);
        this.combo.registerMiss();
        audioManager.playHit();
        this.particles.emitBurst(b.x, b.y, { color: '#ff4444', count: 8, speed: 60 });
        if (this.health <= 0) { this.over = true; audioManager.playGameOver(); }
      } else if (leaning) {
        // Reaching by leaning the whole body doesn't count as a rescue.
        this.feedback = ['Reach with your arm, not by leaning'];
      } else {
        b.caught = true; b.caughtAt = this.elapsed;
        const mult = this.combo.registerHit();
        this.score += Math.round(10 * mult);
        this.success++;
        audioManager.playCollect();
        if (mult > 1) audioManager.playCombo();
        this.particles.emitBurst(b.x, b.y, { color: b.color, count: 12, speed: 80 });
        if (this.success > 0 && this.success % 12 === 0 && this.levelMgr.currentLevel < this.levelMgr.maxLevel) {
          if (this.levelMgr.nextLevel()) audioManager.playLevelUp();
        }
      }
    }

    this.particles.update(dt);
  }

  private spawn(): void {
    const isMoth = Math.random() < 0.18 + this.levelMgr.currentLevel * 0.03;
    const count = isMoth ? 1 : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      this.bugs.push({
        x: 40 + Math.random() * (this.width - 80),
        y: 40 + Math.random() * (this.height - 80),
        vx: (Math.random() - 0.5) * (isMoth ? 90 : 55),
        vy: (Math.random() - 0.5) * (isMoth ? 90 : 55),
        size: isMoth ? 30 + Math.random() * 16 : 34 + Math.random() * 20,
        color: isMoth ? '#8B4513' : COLORS[Math.floor(Math.random() * COLORS.length)],
        isMoth, wing: Math.random() * Math.PI * 2, caught: false, caughtAt: 0, active: true,
      });
    }
  }

  private drawBug(ctx: CanvasRenderingContext2D, b: Butterfly): void {
    const alpha = b.caught ? Math.max(0, 1 - (this.elapsed - b.caughtAt) / 0.5) : 1;
    const rot = Math.sin(this.elapsed * 3 + b.wing) * 0.15;
    const img = b.isMoth
      ? assets.getOrCreate('moth', mothSvg)
      : assets.getOrCreate(`butterfly:${b.color}`, () => butterflySvg(b.color));
    if (img) { drawSprite(ctx, img, b.x, b.y, b.size * 1.9, rot, alpha); return; }

    // Procedural fallback until the sprite decodes.
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
    Renderer.drawProgressBar(ctx, this.width - 130, 16, 110, 10, this.health / 100, this.health > 40 ? safe() : danger());
    Renderer.drawText(ctx, '❤️ Health', this.width - 130, 30, { size: 11, color: '#ccc', align: 'left' });
    if (this.combo.combo >= 3) {
      Renderer.drawText(ctx, `🔥 ${this.combo.combo}x`, this.width / 2, 12, { size: 17, align: 'center', color: '#FF6B6B' });
    }

    if (this.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.width, this.height);
      Renderer.drawText(ctx, '🦋 Session Complete', this.width / 2, this.height / 2 - 20, { size: 28, align: 'center', baseline: 'middle', color: '#FFD740' });
      Renderer.drawText(ctx, `Score ${this.score} · ${this.success} rescued`, this.width / 2, this.height / 2 + 16, { size: 16, align: 'center', baseline: 'middle', color: '#ccc' });
    }
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.success, reps: 0,
      combo: this.combo.combo, multiplier: this.combo.getMultiplier(), maxCombo: this.combo.maxCombo,
      level: this.levelMgr.currentLevel, accuracy: 100,
      feedback: this.feedback, over: this.over, won: this.won,
    };
  }
}

export const butterflyGame: GameRegistration = {
  id: 'butterfly-rescue',
  exercise: butterflyExercise,
  createScene: () => new ButterflyScene(),
};
