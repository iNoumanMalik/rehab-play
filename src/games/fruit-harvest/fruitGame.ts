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
import { danger, safe, warn } from '../../core/engine/palette';
import { shoulderElevation, wristToScreen, upperBodyTracked, handHitRadius } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

export const fruitExercise: ExerciseDefinition = {
  id: 'fruit-harvest',
  name: 'Fruit Harvest',
  rehabFocus: 'Full shoulder range of motion & graded reaching',
  mode: 'reach',
  effort: (lm) => Math.max(shoulderElevation(lm, 'left'), shoulderElevation(lm, 'right')),
  engageThreshold: 0.18,
  repThreshold: 0.75,
  releaseThreshold: 0.32,
  minHoldMs: 150,
  maxRepVelocity: 7,
  checkTrunkLean: true,
  checkAsymmetry: false,
  maxTrunkLeanDeg: 21,
  maxAsymmetry: 1,
  coachRules: [
    { id: 'lean', severity: 'warn', test: (c) => (c.compensations.find(x => x.id === 'trunk-lean')?.label ?? null) },
    { id: 'reach', severity: 'cue', test: (c) => (c.activation < 0.25 ? 'Reach further — extend your arm' : null) },
  ],
  calibration: {
    neutralPrompt: 'Relax with your arms down at your sides',
    maxPrompt: 'Reach one arm straight up, as high as you can',
  },
};

type FruitType = 'apple' | 'orange' | 'banana' | 'grape' | 'strawberry';
type Zone = 'low' | 'mid' | 'high';
type Rating = 'perfect' | 'great' | 'ok';

interface Fruit {
  x: number; y: number; type: FruitType; zone: Zone; wrong: boolean;
  collected: boolean; collectedAt: number; id: number; active: boolean;
}

interface FloatingText { x: number; y: number; text: string; color: string; life: number; }

const FRUIT_COLORS: Record<FruitType, string> = {
  apple: '#FF4444', orange: '#FF9800', banana: '#FFEB3B', grape: '#9C27B0', strawberry: '#E91E63',
};
const FRUIT_EMOJI: Record<FruitType, string> = {
  apple: '🍎', orange: '🍊', banana: '🍌', grape: '🍇', strawberry: '🍓',
};
const RECIPES = [
  { name: 'Fruit Salad', fruits: ['apple', 'orange', 'banana'] as FruitType[], points: 15 },
  { name: 'Fruit Pie', fruits: ['apple', 'strawberry', 'grape'] as FruitType[], points: 20 },
  { name: 'Smoothie', fruits: ['banana', 'strawberry', 'orange'] as FruitType[], points: 25 },
  { name: 'Fruit Feast', fruits: ['apple', 'orange', 'banana', 'grape', 'strawberry'] as FruitType[], points: 30 },
];
const ZONE_Y: Record<Zone, number> = { low: 0.75, mid: 0.5, high: 0.2 };
const ZONE_MIN_ACTIVATION: Record<Zone, number> = { low: 0, mid: 0.25, high: 0.48 };

const RATING_MULT: Record<Rating, number> = { perfect: 2, great: 1.3, ok: 1 };
const RATING_COLOR: Record<Rating, () => string> = { perfect: warn, great: safe, ok: () => '#ffffff' };
const RATING_LABEL: Record<Rating, string> = { perfect: 'PERFECT!', great: 'GREAT!', ok: 'OK' };

function rate(beatDist: number): Rating {
  if (beatDist < 0.12) return 'perfect';
  if (beatDist < 0.28) return 'great';
  return 'ok';
}

/**
 * Rhythm: fruits pulse to a visible beat (Just Dance energy) — catching one
 * right on the pulse earns a PERFECT/GREAT rating on top of the base recipe
 * points, catching off-beat still counts (never punished below baseline).
 * This layers a timing skill on top of the original spatial (3 reach zones)
 * and memory (recipe order) challenge, so it reads as a genuinely different
 * game from Butterfly's continuous "flow" and Crystal's charge-and-release.
 */
export class FruitScene extends Scene {
  private fruits: Fruit[] = [];
  private texts: FloatingText[] = [];
  private particles = new ParticleSystem();
  private combo = new ComboSystem();
  private levelMgr = new LevelManager();
  private score = 0;
  private success = 0;
  private attempts = 0;
  private recipeIdx = 0;
  private collectedInRecipe = 0;
  private elapsed = 0;
  private lastSpawn = 0;
  private nextId = 1;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private successPulse = false;
  private guidance: { x: number; y: number } | null = null;
  private ambient = new AmbientField({ kind: 'ember', colors: ['#FFB74D', '#FF8A65', '#FFD54F'], count: 16, maxAlpha: 0.4 });

  private recipe() { return RECIPES[Math.min(this.recipeIdx, RECIPES.length - 1)]; }
  private beatPeriod(): number { return Math.max(0.55, 0.95 - this.levelMgr.currentLevel * 0.06); }
  private beatPhase(): number { const p = this.beatPeriod(); return (this.elapsed % p) / p; }
  private beatDistance(): number { const ph = this.beatPhase(); return Math.min(ph, 1 - ph); }

  update(dt: number, frame: ExerciseFrame, pose: PoseData | null): void {
    this.elapsed += dt;
    this.ambient.update(dt, this.width, this.height);
    this.successPulse = false;
    if (this.over) { this.particles.update(dt); return; }
    this.combo.update(dt);
    this.feedback = [];

    const cfg = this.levelMgr.getConfig();
    if (this.elapsed - this.lastSpawn > 2.2 && this.fruits.filter(f => f.active).length < cfg.entityLimit) {
      this.spawn();
      this.lastSpawn = this.elapsed;
    }

    const lm = pose?.predictedLandmarks ?? [];
    const tracked = upperBodyTracked(lm);
    let hx = -1000, hy = -1000, hx2 = -1000, hy2 = -1000, radius = 60;
    if (tracked) {
      const w1 = wristToScreen(lm, 'right', this.width, this.height);
      const w2 = wristToScreen(lm, 'left', this.width, this.height);
      hx = w1.x; hy = w1.y; hx2 = w2.x; hy2 = w2.y;
      radius = handHitRadius(lm, this.height, 0.45);
    }

    const recipe = this.recipe();
    const needed = recipe.fruits.length;
    const leaning = frame.compensations.some(c => c.id === 'trunk-lean');

    let nearestGood: { d: number; x: number; y: number } | null = null;

    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      if (!f.active) { this.fruits.splice(i, 1); continue; }
      if (f.collected) { if (this.elapsed - f.collectedAt > 0.5) this.fruits.splice(i, 1); continue; }

      const pulse = Math.sin(this.elapsed * 3 + i) * 3;
      f.y += pulse * 0.1;

      const d1 = Math.hypot(f.x - hx, f.y - hy);
      const d2 = Math.hypot(f.x - hx2, f.y - hy2);
      const touched = d1 < radius || d2 < radius;

      if (!f.wrong && f.type === recipe.fruits[0] && !touched) {
        const d = Math.min(d1, d2);
        if (!nearestGood || d < nearestGood.d) nearestGood = { d, x: f.x, y: f.y };
      }

      if (!touched) continue;

      this.attempts++;
      f.collected = true; f.collectedAt = this.elapsed;

      if (f.wrong) {
        this.combo.registerMiss();
        this.score = Math.max(0, this.score - 10);
        audioManager.playHit();
        this.particles.emitBurst(f.x, f.y, { color: '#ff4444', count: 8, speed: 50 });
        this.pushText(f.x, f.y, 'WRONG', '#ff6b6b');
        continue;
      }

      if (frame.activation < ZONE_MIN_ACTIVATION[f.zone] || (f.zone !== 'low' && leaning)) {
        f.collected = false; // don't consume — let them try again with better form
        this.attempts--;
        this.feedback = [leaning ? 'Reach with your arm, not by leaning' : 'Raise your arm higher to reach it'];
        continue;
      }

      const rating = rate(this.beatDistance());
      const mult = this.combo.registerHit();
      const points = Math.round(recipe.points * mult * RATING_MULT[rating]);
      this.score += points;
      this.success++;
      this.collectedInRecipe++;
      this.successPulse = true;
      audioManager.playCollect();
      if (rating === 'perfect') audioManager.playCombo();
      if (mult > 1) audioManager.playCombo();
      this.particles.emitBurst(f.x, f.y, { color: '#69F0AE', count: 10, speed: 70 });
      this.pushText(f.x, f.y - 10, RATING_LABEL[rating], RATING_COLOR[rating]());

      if (this.collectedInRecipe >= needed) {
        this.collectedInRecipe = 0;
        audioManager.playSuccess();
        if (this.recipeIdx < RECIPES.length - 1) {
          this.recipeIdx++;
          this.levelMgr.nextLevel();
        } else {
          this.over = true; this.won = true; audioManager.playVictory();
        }
      }
    }

    this.guidance = nearestGood && nearestGood.d > radius * 1.4 ? { x: nearestGood.x, y: nearestGood.y } : null;

    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].life -= dt;
      this.texts[i].y -= dt * 30;
      if (this.texts[i].life <= 0) this.texts.splice(i, 1);
    }
    this.particles.update(dt);
  }

  private pushText(x: number, y: number, text: string, color: string): void {
    this.texts.push({ x, y, text, color, life: 0.7 });
  }

  private spawn(): void {
    const recipe = this.recipe();
    const zones: Zone[] = ['low', 'mid', 'high'];
    const count = 1 + Math.floor(Math.random() * 2);
    const wrongChance = 0.16 + this.levelMgr.currentLevel * 0.035;
    for (let i = 0; i < count; i++) {
      const zone = zones[Math.floor(Math.random() * 3)];
      const wrong = Math.random() < wrongChance;
      const pool: FruitType[] = wrong
        ? (Object.keys(FRUIT_COLORS) as FruitType[]).filter(t => !recipe.fruits.includes(t))
        : recipe.fruits;
      const type = (pool.length ? pool : recipe.fruits)[Math.floor(Math.random() * (pool.length || recipe.fruits.length))];
      this.fruits.push({
        x: 60 + Math.random() * (this.width - 120),
        y: this.height * ZONE_Y[zone] + (Math.random() - 0.5) * 30,
        type, zone, wrong, collected: false, collectedAt: 0, id: this.nextId++, active: true,
      });
    }
  }

  private renderMetronome(ctx: CanvasRenderingContext2D): void {
    const cx = this.width / 2;
    const cy = 118; // below the DOM HUD strip + ObjectiveBanner (top ~12-98px)
    const beatDist = this.beatDistance();
    const pulse = Math.max(0, 1 - beatDist * 4); // spikes right on the beat
    ctx.save();
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.strokeStyle = warn();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 + pulse * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D): void {
    Renderer.clear(ctx, this.width, this.height);
    Renderer.drawVignette(ctx, this.width, this.height, '#2a1607', 0.42);
    this.ambient.render(ctx);
    const recipe = this.recipe();

    for (const zone of ['high', 'mid', 'low'] as Zone[]) {
      const y = this.height * ZONE_Y[zone];
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
      ctx.setLineDash([]);
    }

    const beatDist = this.beatDistance();
    const beatPulse = Math.max(0, 1 - beatDist * 4) * 8;

    for (const f of this.fruits) {
      const alpha = f.collected ? Math.max(0, 1 - (this.elapsed - f.collectedAt) / 0.5) : 1;
      const wobble = Math.sin(this.elapsed * 3 + f.id) * 3;
      const size = 58 + (f.wrong ? 0 : beatPulse);
      const img = assets.getOrCreate(`fruit:${f.type}`, () => fruitSvg(f.type));
      if (img) {
        drawSprite(ctx, img, f.x, f.y + wobble, size, 0, alpha);
      } else {
        ctx.globalAlpha = alpha;
        Renderer.drawGlow(ctx, f.x, f.y + wobble, 38, FRUIT_COLORS[f.type]);
        Renderer.drawCircle(ctx, f.x, f.y + wobble, 26, FRUIT_COLORS[f.type]);
        ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(FRUIT_EMOJI[f.type], f.x, f.y + wobble + 1);
        ctx.globalAlpha = 1;
      }
      if (f.wrong) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = danger(); ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(f.x, f.y + wobble, 32, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(f.x - 22, f.y + wobble - 22); ctx.lineTo(f.x + 22, f.y + wobble + 22); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    this.particles.render(ctx);

    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / 0.7);
      Renderer.drawText(ctx, t.text, t.x, t.y, { size: 18, align: 'center', baseline: 'middle', color: t.color });
      ctx.globalAlpha = 1;
    }

    // Kept below the DOM HUD strip AND the ObjectiveBanner (top ~12-98px,
    // which already announces the recipe name, so it isn't repeated here).
    Renderer.drawHudBand(ctx, this.width, 96, 64);
    Renderer.drawText(ctx, `Score: ${this.score}`, 16, 108, { size: 18, align: 'left' });
    Renderer.drawText(ctx, `Level ${this.levelMgr.currentLevel}`, this.width - 16, 108, { size: 13, align: 'right', color: '#88ccff' });
    this.renderMetronome(ctx);
    Renderer.drawText(ctx, `${'●'.repeat(this.collectedInRecipe)}${'○'.repeat(Math.max(0, recipe.fruits.length - this.collectedInRecipe))}`, this.width / 2, 140, { size: 15, align: 'center', color: '#aaa' });
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.success, reps: 0,
      combo: this.combo.combo, multiplier: this.combo.getMultiplier(), maxCombo: this.combo.maxCombo,
      level: this.levelMgr.currentLevel,
      accuracy: this.attempts ? Math.round((this.success / this.attempts) * 100) : 100,
      feedback: this.feedback, over: this.over, won: this.won,
      objective: `Catch to the beat — Recipe: ${this.recipe().name}`,
      guidance: this.guidance,
      successPulse: this.successPulse,
    };
  }
}

export const fruitGame: GameRegistration = {
  id: 'fruit-harvest',
  exercise: fruitExercise,
  createScene: () => new FruitScene(),
};
