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
import { safe, warn, danger } from '../../core/engine/palette';
import { overheadElevation } from '../../core/exercise';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

export const crystalExercise: ExerciseDefinition = {
  id: 'crystal-guardian',
  name: 'Crystal Guardian',
  rehabFocus: 'Bilateral overhead press & shoulder stability',
  mode: 'rep',
  effort: overheadElevation,
  engageThreshold: 0.22,
  repThreshold: 0.72,
  releaseThreshold: 0.3,
  minHoldMs: 220,
  maxRepVelocity: 6,
  checkTrunkLean: true,
  checkAsymmetry: true,
  maxTrunkLeanDeg: 19,
  maxAsymmetry: 0.45,
  coachRules: [
    { id: 'lean', severity: 'warn', test: (c) => (c.compensations.find(x => x.id === 'trunk-lean')?.label ?? null) },
    { id: 'asym', severity: 'warn', test: (c) => (c.compensations.find(x => x.id === 'asymmetry')?.label ?? null) },
    { id: 'higher', severity: 'cue', test: (c) => (c.phase === 'ascending' && c.activation < 0.72 ? 'Reach higher — arms fully overhead' : null) },
    { id: 'start', severity: 'cue', test: (c) => (c.phase === 'idle' && c.activation < 0.2 ? 'Raise both arms overhead to charge the crystal' : null) },
  ],
  calibration: {
    neutralPrompt: 'Relax with your arms down at your sides',
    maxPrompt: 'Reach both arms straight up, as high as you can',
  },
};

interface Enemy {
  x: number; y: number; angle: number; speed: number; size: number;
  health: number; maxHealth: number; color: string; hitTime: number; active: boolean; isBoss: boolean;
}
interface Shockwave { x: number; y: number; r: number; maxR: number; color: string; life: number; }

const ENEMY_COLORS = ['#EF5350', '#AB47BC', '#EC407A', '#FF7043'];
const KILLS_PER_LEVEL = 6;
const VICTORY_SEQUENCE_SEC = 1.7;

const OBJECTIVE_BY_PHASE: Record<string, string> = {
  idle: 'Raise both arms overhead, evenly',
  ascending: 'Keep reaching — higher, together',
  hold: 'Hold... now lower to release the blast!',
  descending: 'Great! Charge again',
};

/**
 * Power: a charge-and-release boss battle (Ring Fit Adventure energy). Every
 * clean, held overhead press is a dramatic release — screen shake, a
 * shockwave ring, and (on the boss) a slow-motion victory beat instead of an
 * instant cut — so effortful reps feel like they matter, not just count.
 */
export class CrystalScene extends Scene {
  private enemies: Enemy[] = [];
  private shockwaves: Shockwave[] = [];
  private particles = new ParticleSystem();
  private combo = new ComboSystem();
  private levelMgr = new LevelManager();
  private score = 0;
  private kills = 0;
  private killsThisLevel = 0;
  private reps = 0;
  private activation = 0;
  private phase: ExerciseFrame['phase'] = 'idle';
  private crystalHealth = 100;
  private elapsed = 0;
  private lastSpawn = 0;
  private bossActive = false;
  private bossDefeated = false;
  private victoryTimer = 0;
  private shake = 0;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private successPulse = false;
  private ambient = new AmbientField({ kind: 'mote', colors: ['#4FC3F7', '#B388FF', '#80DEEA'], count: 24, maxAlpha: 0.4 });

  update(dt: number, frame: ExerciseFrame, _pose: PoseData | null): void {
    void _pose;
    this.reps = frame.reps;
    this.activation = frame.activation;
    this.phase = frame.phase;
    this.ambient.update(dt, this.width, this.height);
    this.successPulse = false;
    this.shake = Math.max(0, this.shake - dt * 3.5);
    this.updateShockwaves(dt);

    if (this.over) { this.particles.update(dt); return; }

    // Boss just fell: hold on a celebratory beat before the real "over" cut.
    if (this.bossDefeated) {
      this.victoryTimer += dt;
      this.particles.update(dt);
      if (Math.random() < dt * 3) {
        this.particles.emitBurst(
          Math.random() * this.width, Math.random() * this.height * 0.6,
          { colors: ['#FFD740', '#FF6B6B', '#69F0AE', '#64B5F6'], count: 10, speed: 60, lifetime: 0.8 },
        );
      }
      if (this.victoryTimer >= VICTORY_SEQUENCE_SEC) { this.over = true; this.won = true; }
      return;
    }

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
        this.shake = Math.min(1, this.shake + 0.5);
        audioManager.playHit();
        this.combo.registerMiss();
        e.active = false;
        if (this.crystalHealth <= 0) { this.over = true; audioManager.playGameOver(); }
      }
    }
    this.particles.update(dt);
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += dt * 340;
      s.life -= dt * 1.6;
      if (s.life <= 0 || s.r > s.maxR) this.shockwaves.splice(i, 1);
    }
  }

  private spawnWave(): void {
    const count = 1 + Math.floor(Math.random() * 2);
    const speedMul = this.levelMgr.getSpeedMultiplier();
    for (let i = 0; i < count; i++) this.enemies.push(this.makeEnemy(speedMul, false));
  }

  private spawnBoss(): void {
    const boss = this.makeEnemy(0.75, true);
    boss.size = 58; boss.health = 6; boss.maxHealth = 6; boss.color = '#E53935';
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
      health: isBoss ? 6 : 1, maxHealth: isBoss ? 6 : 1,
      color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
      hitTime: 0, active: true, isBoss,
    };
  }

  private blast(cx: number, cy: number): void {
    const radius = Math.min(this.width, this.height) * 0.48;
    this.particles.emitBurst(cx, cy, { color: '#FFD740', count: 26, speed: 170, lifetime: 0.6 });
    this.shockwaves.push({ x: cx, y: cy, r: 20, maxR: radius * 1.3, color: '#FFD740', life: 1 });
    this.shake = Math.min(1, this.shake + 0.35);
    this.successPulse = true;
    audioManager.playSuccess();
    let hitAny = false;

    for (const e of this.enemies) {
      if (!e.active) continue;
      if (Math.hypot(e.x - cx, e.y - cy) > radius) continue;
      e.health--;
      e.hitTime = this.elapsed;
      hitAny = true;
      this.particles.emitBurst(e.x, e.y, { color: e.color, count: e.isBoss ? 20 : 10, speed: 90 });
      if (e.health <= 0) {
        e.active = false;
        const mult = this.combo.registerHit();
        this.score += Math.round((e.isBoss ? 300 : 50) * mult);
        this.kills++;
        this.killsThisLevel++;
        if (mult > 1) audioManager.playCombo();
        if (e.isBoss) {
          this.bossDefeated = true;
          this.shake = 1;
          this.shockwaves.push({ x: e.x, y: e.y, r: 10, maxR: Math.max(this.width, this.height), color: '#FFD740', life: 1.2 });
          audioManager.playVictory();
        }
      }
    }
    if (hitAny && this.killsThisLevel >= KILLS_PER_LEVEL && this.levelMgr.currentLevel < this.levelMgr.maxLevel) {
      this.killsThisLevel = 0;
      if (this.levelMgr.nextLevel()) audioManager.playLevelUp();
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
    // Boss escalates visually as it takes damage — a visible "phase" change, not just a health number.
    const dmgFrac = e.isBoss ? 1 - e.health / e.maxHealth : 0;
    const tint = dmgFrac > 0.6 ? danger() : e.color;
    const img = e.isBoss
      ? assets.getOrCreate(`boss:${tint}`, () => bossSvg(tint))
      : assets.getOrCreate(`enemy:${e.color}`, () => enemySvg(e.color));
    const angerShake = e.isBoss ? dmgFrac * 3 : 0;
    const bob = Math.sin(this.elapsed * 4 + e.x) * 2 + (Math.random() - 0.5) * angerShake;
    const size = e.size * 2.1 * (e.isBoss ? 1 + dmgFrac * 0.15 : 1);

    if (img) {
      drawSprite(ctx, img, e.x + (Math.random() - 0.5) * angerShake, e.y + bob, size);
    } else {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = tint;
      ctx.beginPath(); ctx.arc(0, 0, e.size, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (this.elapsed - e.hitTime < 0.12) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.isBoss) {
      Renderer.drawProgressBar(ctx, e.x - 40, e.y - e.size - 18, 80, 6, e.health / e.maxHealth, dmgFrac > 0.6 ? danger() : warn());
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.shake > 0.01) {
      ctx.translate((Math.random() - 0.5) * this.shake * 14, (Math.random() - 0.5) * this.shake * 14);
    }

    Renderer.clear(ctx, this.width, this.height);
    Renderer.drawVignette(ctx, this.width, this.height, '#081826', 0.5);
    this.ambient.render(ctx);
    const cx = this.width / 2, cy = this.height / 2;

    const chargePct = Math.min(1, this.activation);
    const crystalColor = chargePct >= 0.95 ? safe() : chargePct > 0.5 ? warn() : '#64B5F6';
    const pulse = Math.sin(this.elapsed * 4) * 0.05 + 1;
    Renderer.drawGlow(ctx, cx, cy, 74 * pulse * (0.7 + chargePct * 0.6), crystalColor);
    const crystalImg = assets.getOrCreate(`crystal:${crystalColor}`, () => crystalSvg(crystalColor));
    if (crystalImg) drawSprite(ctx, crystalImg, cx, cy, 74 * pulse);
    else Renderer.drawCircle(ctx, cx, cy, 26 * pulse, crystalColor);
    if (!this.bossDefeated) Renderer.drawProgressBar(ctx, cx - 55, cy + 52, 110, 9, chargePct, crystalColor);

    for (const e of this.enemies) this.drawEnemy(ctx, e);

    for (const s of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.particles.render(ctx);

    if (this.bossDefeated) {
      const t = Math.min(1, this.victoryTimer / VICTORY_SEQUENCE_SEC);
      ctx.globalAlpha = Math.min(1, t * 2);
      Renderer.drawText(ctx, '⚔️ TEMPLE DEFENDED', cx, cy - 90, { size: 30, align: 'center', baseline: 'middle', color: '#FFD740' });
      ctx.globalAlpha = 1;
    } else {
      // Kept below the DOM HUD strip AND the ObjectiveBanner (top ~12-98px);
      // combo is shown by the shared ComboDisplay overlay, not duplicated here.
      Renderer.drawHudBand(ctx, this.width, 96, 52);
      Renderer.drawText(ctx, `Score: ${this.score}`, 16, 108, { size: 20, align: 'left' });
      Renderer.drawText(ctx, `Reps: ${this.reps}  ·  Wave ${this.levelMgr.currentLevel}`, 16, 132, { size: 13, color: '#aaa', align: 'left' });
    }
    ctx.restore();
  }

  getState(): SceneState {
    return {
      score: this.score, success: this.kills, reps: this.reps,
      combo: this.combo.combo, multiplier: this.combo.getMultiplier(), maxCombo: this.combo.maxCombo,
      level: this.levelMgr.currentLevel, accuracy: 100,
      feedback: this.feedback, over: this.over, won: this.won,
      health: { current: this.crystalHealth, max: 100 },
      objective: this.bossDefeated ? 'Victory!' : OBJECTIVE_BY_PHASE[this.phase],
      guidance: null,
      successPulse: this.successPulse,
    };
  }
}

export const crystalGame: GameRegistration = {
  id: 'crystal-guardian',
  exercise: crystalExercise,
  createScene: () => new CrystalScene(),
};
