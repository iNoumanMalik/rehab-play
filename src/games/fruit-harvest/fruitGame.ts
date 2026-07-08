import type { PoseData } from '../../types';
import { Scene, type SceneState } from '../../core/engine/Scene';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { ComboSystem } from '../../core/engine/ComboSystem';
import { LevelManager } from '../../core/engine/LevelManager';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { shoulderElevation, wristToScreen, upperBodyTracked } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

export const fruitExercise: ExerciseDefinition = {
  id: 'fruit-harvest',
  name: 'Fruit Harvest',
  rehabFocus: 'Full shoulder range of motion & graded reaching',
  mode: 'reach',
  effort: (lm) => Math.max(shoulderElevation(lm, 'left'), shoulderElevation(lm, 'right')),
  engageThreshold: 0.2,
  repThreshold: 0.75,
  releaseThreshold: 0.35,
  minHoldMs: 200,
  maxRepVelocity: 6,
  checkTrunkLean: true,
  checkAsymmetry: false,
  maxTrunkLeanDeg: 18,
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

interface Fruit {
  x: number; y: number; type: FruitType; zone: Zone; wrong: boolean;
  collected: boolean; collectedAt: number; id: number; active: boolean;
}

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
const ZONE_MIN_ACTIVATION: Record<Zone, number> = { low: 0, mid: 0.3, high: 0.55 };

export class FruitScene extends Scene {
  private fruits: Fruit[] = [];
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

  private recipe() { return RECIPES[Math.min(this.recipeIdx, RECIPES.length - 1)]; }

  update(dt: number, frame: ExerciseFrame, pose: PoseData | null): void {
    if (this.over) { this.particles.update(dt); return; }
    this.elapsed += dt;
    this.combo.update(dt);
    this.feedback = [];

    const cfg = this.levelMgr.getConfig();
    if (this.elapsed - this.lastSpawn > 2.4 && this.fruits.filter(f => f.active).length < cfg.entityLimit) {
      this.spawn();
      this.lastSpawn = this.elapsed;
    }

    const lm = pose?.smoothLandmarks ?? [];
    const hands = upperBodyTracked(lm)
      ? [wristToScreen(lm, 'left', this.width, this.height), wristToScreen(lm, 'right', this.width, this.height)]
      : [];
    const leaning = frame.compensations.some(c => c.id === 'trunk-lean');

    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      if (!f.active) { this.fruits.splice(i, 1); continue; }
      if (f.collected) { if (this.elapsed - f.collectedAt > 0.5) this.fruits.splice(i, 1); continue; }

      const touched = hands.some(h => Math.hypot(f.x - h.x, f.y - h.y) < 46);
      if (!touched) continue;

      if (f.wrong) {
        this.attempts++;
        f.collected = true; f.collectedAt = this.elapsed;
        this.combo.registerMiss();
        this.score = Math.max(0, this.score - 10);
        this.feedback = ['Wrong fruit! Only collect the recipe.'];
        audioManager.playHit();
        this.particles.emitBurst(f.x, f.y, { color: '#ff4444', count: 8, speed: 50 });
        continue;
      }

      // Correct fruit: must be reached with real range, not by leaning.
      if (frame.activation < ZONE_MIN_ACTIVATION[f.zone] || (f.zone !== 'low' && leaning)) {
        this.feedback = [leaning ? 'Reach with your arm, not by leaning' : 'Raise your arm higher to reach it'];
        continue;
      }

      this.attempts++;
      f.collected = true; f.collectedAt = this.elapsed;
      const mult = this.combo.registerHit();
      this.score += Math.round(this.recipe().points * mult);
      this.success++;
      this.collectedInRecipe++;
      audioManager.playCollect();
      if (mult > 1) audioManager.playCombo();
      this.particles.emitBurst(f.x, f.y, { color: '#69F0AE', count: 10, speed: 70 });

      if (this.collectedInRecipe >= this.recipe().fruits.length) {
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

    this.particles.update(dt);
  }

  private spawn(): void {
    const recipe = this.recipe();
    const zones: Zone[] = ['low', 'mid', 'high'];
    const count = 1 + Math.floor(Math.random() * 2);
    const wrongChance = 0.18 + this.levelMgr.currentLevel * 0.04;
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

  render(ctx: CanvasRenderingContext2D): void {
    Renderer.clear(ctx, this.width, this.height);
    const recipe = this.recipe();

    // zone guides
    for (const zone of ['high', 'mid', 'low'] as Zone[]) {
      const y = this.height * ZONE_Y[zone];
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const f of this.fruits) {
      ctx.globalAlpha = f.collected ? Math.max(0, 1 - (this.elapsed - f.collectedAt) / 0.5) : 1;
      const wobble = Math.sin(this.elapsed * 3 + f.id) * 3;
      Renderer.drawGlow(ctx, f.x, f.y + wobble, 38, FRUIT_COLORS[f.type]);
      Renderer.drawCircle(ctx, f.x, f.y + wobble, 26, FRUIT_COLORS[f.type]);
      if (f.wrong) {
        ctx.strokeStyle = 'rgba(255,60,60,0.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y + wobble, 30, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(FRUIT_EMOJI[f.type], f.x, f.y + wobble + 1);
      ctx.globalAlpha = 1;
    }
    this.particles.render(ctx);

    Renderer.drawText(ctx, `Recipe: ${recipe.name}`, this.width / 2, 12, { size: 17, align: 'center', color: '#FFD740' });
    Renderer.drawText(ctx, `${'●'.repeat(this.collectedInRecipe)}${'○'.repeat(Math.max(0, recipe.fruits.length - this.collectedInRecipe))}`, this.width / 2, 36, { size: 15, align: 'center', color: '#aaa' });
    Renderer.drawText(ctx, `Score: ${this.score}`, 16, 12, { size: 18, align: 'left' });
    Renderer.drawText(ctx, `Level ${this.levelMgr.currentLevel}`, this.width - 16, 12, { size: 13, align: 'right', color: '#88ccff' });

    if (this.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.width, this.height);
      Renderer.drawText(ctx, '🧺 Harvest Complete!', this.width / 2, this.height / 2 - 20, { size: 28, align: 'center', baseline: 'middle', color: '#FFD740' });
      Renderer.drawText(ctx, `Score ${this.score} · ${this.success} fruits`, this.width / 2, this.height / 2 + 16, { size: 16, align: 'center', baseline: 'middle', color: '#ccc' });
    }
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.success, reps: 0,
      combo: this.combo.combo, multiplier: this.combo.getMultiplier(), maxCombo: this.combo.maxCombo,
      level: this.levelMgr.currentLevel,
      accuracy: this.attempts ? Math.round((this.success / this.attempts) * 100) : 100,
      feedback: this.feedback, over: this.over, won: this.won,
    };
  }
}

export const fruitGame: GameRegistration = {
  id: 'fruit-harvest',
  exercise: fruitExercise,
  createScene: () => new FruitScene(),
};
