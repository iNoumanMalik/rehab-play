import type { PoseData } from '../../types';
import { Scene, type SceneState } from '../../core/engine/Scene';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { ComboSystem } from '../../core/engine/ComboSystem';
import { LevelManager } from '../../core/engine/LevelManager';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { AmbientField } from '../../core/engine/AmbientField';
import { assets, drawSprite } from '../../core/assets/AssetSystem';
import { crystalSvg, enemySvg, bossSvg } from '../../core/assets/sprites';
import { danger, safe, warn } from '../../core/engine/palette';
import { overheadElevation } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

export const crystalExercise: ExerciseDefinition = {
  id: 'crystal-guardian',
  name: 'Crystal Guardian',
  rehabFocus: 'Bilateral overhead press & shoulder stability',
  mode: 'rep',
  effort: overheadElevation,
  engageThreshold: 0.25,
  repThreshold: 0.8,
  releaseThreshold: 0.35,
  minHoldMs: 300,
  maxRepVelocity: 4.5,
  checkTrunkLean: true,
  checkAsymmetry: true,
  maxTrunkLeanDeg: 16,
  maxAsymmetry: 0.38,
  coachRules: [
    { id: 'lean', severity: 'warn', test: (c) => (c.compensations.find(x => x.id === 'trunk-lean')?.label ?? null) },
    { id: 'asym', severity: 'warn', test: (c) => (c.compensations.find(x => x.id === 'asymmetry')?.label ?? null) },
    { id: 'higher', severity: 'cue', test: (c) => (c.phase === 'ascending' && c.activation < 0.8 ? 'Reach higher — arms fully overhead' : null) },
    { id: 'start', severity: 'cue', test: (c) => (c.phase === 'idle' && c.activation < 0.2 ? 'Raise both arms overhead to charge the crystal' : null) },
  ],
  calibration: {
    neutralPrompt: 'Relax with your arms down at your sides',
    maxPrompt: 'Reach both arms straight up, as high as you can',
  },
};

interface Enemy {
  x: number; y: number; angle: number; speed: number; size: number;
  health: number; color: string; hitTime: number; active: boolean; isBoss: boolean;
}

const ENEMY_COLORS = ['#EF5350', '#AB47BC', '#EC407A', '#FF7043'];
const KILLS_PER_LEVEL = 6;

export class CrystalScene extends Scene {
  private enemies: Enemy[] = [];
  private particles = new ParticleSystem();
  private combo = new ComboSystem();
  private levelMgr = new LevelManager();
  private score = 0;
  private kills = 0;
  private killsThisLevel = 0;
  private reps = 0;
  private activation = 0;
  private crystalHealth = 100;
  private elapsed = 0;
  private lastSpawn = 0;
  private bossActive = false;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private ambient = new AmbientField({ kind: 'mote', colors: ['#4FC3F7', '#B388FF', '#80DEEA'], count: 24, maxAlpha: 0.4 });

  update(dt: number, frame: ExerciseFrame, _pose: PoseData | null): void {
    void _pose;
    this.reps = frame.reps;
    this.activation = frame.activation;
    this.ambient.update(dt, this.width, this.height);
    if (this.over) { this.particles.update(dt); return; }

    this.elapsed += dt;
    this.combo.update(dt);
    const cx = this.width / 2, cy = this.height / 2;

    // A clean, held overhead press fires a blast; a bad-form rep does not.
    if (frame.rep?.valid) this.blast(cx, cy);

    const cfg = this.levelMgr.getConfig();
    if (this.elapsed - this.lastSpawn > cfg.spawnRate * 0.9 && this.enemies.length < cfg.entityLimit) {
      this.spawnWave();
      this.lastSpawn = this.elapsed;
    }
    if (cfg.hasBoss && !this.bossActive && this.enemies.every(e => !e.isBoss)) {
      this.spawnBoss();
      this.bossActive = true;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.active) { this.enemies.splice(i, 1); continue; }
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
      if (Math.hypot(e.x - cx, e.y - cy) < 42) {
        this.crystalHealth = Math.max(0, this.crystalHealth - (e.isBoss ? 40 : 14));
        this.particles.emitBurst(cx, cy, { color: '#EF5350', count: 14, speed: 90 });
        audioManager.playHit();
        this.combo.registerMiss();
        e.active = false;
        if (this.crystalHealth <= 0) { this.over = true; audioManager.playGameOver(); }
      }
    }
    this.particles.update(dt);
  }

  private spawnWave(): void {
    const count = 1 + Math.floor(Math.random() * 2);
    const speedMul = this.levelMgr.getSpeedMultiplier();
    for (let i = 0; i < count; i++) this.enemies.push(this.makeEnemy(speedMul, false));
  }

  private spawnBoss(): void {
    const boss = this.makeEnemy(0.8, true);
    boss.size = 58; boss.health = 5; boss.color = '#E53935';
    this.enemies.push(boss);
  }

  private makeEnemy(speedMul: number, isBoss: boolean): Enemy {
    const cx = this.width / 2, cy = this.height / 2;
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -40 : side === 1 ? this.width + 40 : Math.random() * this.width;
    const y = side <= 1 ? Math.random() * this.height : side === 2 ? -40 : this.height + 40;
    return {
      x, y, angle: Math.atan2(cy - y, cx - x),
      speed: (28 + Math.random() * 34) * speedMul,
      size: isBoss ? 58 : 24 + Math.random() * 14,
      health: isBoss ? 5 : 1,
      color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
      hitTime: 0, active: true, isBoss,
    };
  }

  private blast(cx: number, cy: number): void {
    const radius = Math.min(this.width, this.height) * 0.48;
    this.particles.emitBurst(cx, cy, { color: '#FFD740', count: 26, speed: 170, lifetime: 0.6 });
    audioManager.playSuccess();
    let hitAny = false;

    for (const e of this.enemies) {
      if (!e.active) continue;
      if (Math.hypot(e.x - cx, e.y - cy) > radius) continue;
      e.health--;
      e.hitTime = this.elapsed;
      hitAny = true;
      this.particles.emitBurst(e.x, e.y, { color: e.color, count: 10, speed: 90 });
      if (e.health <= 0) {
        e.active = false;
        const mult = this.combo.registerHit();
        this.score += Math.round((e.isBoss ? 300 : 50) * mult);
        this.kills++;
        this.killsThisLevel++;
        if (mult > 1) audioManager.playCombo();
        if (e.isBoss) { this.won = true; this.over = true; audioManager.playVictory(); }
      }
    }
    if (hitAny && this.killsThisLevel >= KILLS_PER_LEVEL && this.levelMgr.currentLevel < this.levelMgr.maxLevel) {
      this.killsThisLevel = 0;
      if (this.levelMgr.nextLevel()) audioManager.playLevelUp();
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
    const img = e.isBoss
      ? assets.getOrCreate(`boss:${e.color}`, () => bossSvg(e.color))
      : assets.getOrCreate(`enemy:${e.color}`, () => enemySvg(e.color));
    const bob = Math.sin(this.elapsed * 4 + e.x) * 2;
    if (img) {
      drawSprite(ctx, img, e.x, e.y + bob, e.size * 2.1);
    } else {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(0, 0, e.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (this.elapsed - e.hitTime < 0.12) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    Renderer.clear(ctx, this.width, this.height);
    Renderer.drawVignette(ctx, this.width, this.height, '#081826', 0.5);
    this.ambient.render(ctx);
    const cx = this.width / 2, cy = this.height / 2;

    // Crystal, charged by live activation
    const chargePct = Math.min(1, this.activation);
    const crystalColor = chargePct >= 0.95 ? safe() : chargePct > 0.5 ? warn() : '#64B5F6';
    const pulse = Math.sin(this.elapsed * 4) * 0.05 + 1;
    Renderer.drawGlow(ctx, cx, cy, 74 * pulse * (0.7 + chargePct * 0.6), crystalColor);
    const crystalImg = assets.getOrCreate(`crystal:${crystalColor}`, () => crystalSvg(crystalColor));
    if (crystalImg) drawSprite(ctx, crystalImg, cx, cy, 74 * pulse);
    else Renderer.drawCircle(ctx, cx, cy, 26 * pulse, crystalColor);
    Renderer.drawProgressBar(ctx, cx - 55, cy + 52, 110, 9, chargePct, crystalColor);

    for (const e of this.enemies) this.drawEnemy(ctx, e);
    this.particles.render(ctx);

    // HUD
    Renderer.drawText(ctx, `Score: ${this.score}`, 16, 14, { size: 20, align: 'left' });
    Renderer.drawText(ctx, `Reps: ${this.reps}  ·  Wave ${this.levelMgr.currentLevel}`, 16, 42, { size: 13, color: '#aaa', align: 'left' });
    Renderer.drawProgressBar(ctx, this.width - 130, 18, 110, 10, this.crystalHealth / 100, this.crystalHealth > 40 ? safe() : danger());
    Renderer.drawText(ctx, '🛡 Crystal', this.width - 130, 32, { size: 11, color: '#ccc', align: 'left' });
    if (this.combo.combo >= 3) {
      Renderer.drawText(ctx, `🔥 ${this.combo.combo}x`, cx, 14, { size: 18, align: 'center', color: '#FF6B6B' });
    }

    if (this.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.width, this.height);
      Renderer.drawText(ctx, this.won ? '⚔️ Temple Defended!' : '💥 Crystal Shattered', cx, cy - 30, { size: 30, align: 'center', baseline: 'middle', color: this.won ? '#FFD740' : '#EF5350' });
      Renderer.drawText(ctx, `Score ${this.score} · ${this.reps} clean reps · ${this.kills} kills`, cx, cy + 14, { size: 16, align: 'center', baseline: 'middle', color: '#ccc' });
    }
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.kills, reps: this.reps,
      combo: this.combo.combo, multiplier: this.combo.getMultiplier(), maxCombo: this.combo.maxCombo,
      level: this.levelMgr.currentLevel, accuracy: 100,
      feedback: this.feedback, over: this.over, won: this.won,
    };
  }
}

export const crystalGame: GameRegistration = {
  id: 'crystal-guardian',
  exercise: crystalExercise,
  createScene: () => new CrystalScene(),
};
