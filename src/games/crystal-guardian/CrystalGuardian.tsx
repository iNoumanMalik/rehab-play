import { useEffect, useRef } from 'react';
import type { PoseData } from '../../types';
import { LANDMARK } from '../../types';
import { Entity } from '../../core/engine/Entity';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { ComboSystem } from '../../core/engine/ComboSystem';
import { LevelManager } from '../../core/engine/LevelManager';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { analyticsService } from '../../core/services/AnalyticsService';

interface EnemyEntity extends Entity {
  size: number;
  health: number;
  maxHealth: number;
  speed: number;
  shielded: boolean;
  color: string;
  angleDir: number;
  hitTime: number;
}

type Props = {
  poseDataRef: React.RefObject<PoseData | null>;
  onScoreUpdate: (s: number) => void;
  onSuccessUpdate: (_c: number) => void;
  onRepetitionsUpdate?: (_c: number) => void;
  onGameEnd: (stats: { score: number; level: number; maxCombo: number; accuracy: number; feedback: string[] }) => void;
  onFeedback: (m: string[]) => void;
  onComboUpdate?: (_c: number, _m: number) => void;
};

const ENEMY_COLORS = ['#EF5350', '#AB47BC', '#EC407A', '#FF7043'];

function createEnemy(w: number, h: number, speedMul: number, shielded: boolean): EnemyEntity {
  const e = new Entity();
  const side = Math.random() < 0.5 ? -1 : 1;
  e.x = side === -1 ? -40 : w + 40;
  e.y = 50 + Math.random() * (h - 100);
  const angleDir = Math.atan2(h / 2 - e.y, w / 2 - e.x);
  const size = 35 + Math.random() * 20;
  return Object.assign(e, {
    size,
    health: shielded ? 2 : 1,
    maxHealth: shielded ? 2 : 1,
    speed: (30 + Math.random() * 40) * speedMul,
    shielded,
    color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
    angleDir,
    hitTime: 0,
  });
}

export function CrystalGuardian({
  poseDataRef, onScoreUpdate, onGameEnd, onFeedback,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const enemies = useRef<EnemyEntity[]>([]);
  const particles = useRef(new ParticleSystem());
  const combo = useRef(new ComboSystem());
  const levelMgr = useRef(new LevelManager());
  const score = useRef(0);
  const charge = useRef(0);
  const maxCharge = useRef(100);
  const chargeRate = useRef(0);
  const kills = useRef(0);
  const waveCount = useRef(0);
  const elapsed = useRef(0);
  const lastSpawn = useRef(0);
  const lastScoreRef = useRef(0);
  const gameOver = useRef(false);
  const bossActive = useRef(false);
  const fightStarted = useRef(false);

  useEffect(() => {
    analyticsService.startSession('crystal-guardian');
    fightStarted.current = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) resize();
      Renderer.clear(ctx, canvas.width, canvas.height);
      const dt = 1 / 60;
      elapsed.current += dt;

      if (!gameOver.current) combo.current.update(dt);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const lm = poseDataRef.current?.smoothLandmarks ?? [];
      if (lm.length > 16) {
        const rightWristY = lm[LANDMARK.RIGHT_WRIST].y;
        const leftWristY = lm[LANDMARK.LEFT_WRIST].y;
        const avgY = (rightWristY + leftWristY) / 2;
        const hx = (1 - lm[LANDMARK.RIGHT_WRIST].x) * canvas.width;
        const hy = lm[LANDMARK.RIGHT_WRIST].y * canvas.height;
        const hx2 = (1 - lm[LANDMARK.LEFT_WRIST].x) * canvas.width;
        const hy2 = lm[LANDMARK.LEFT_WRIST].y * canvas.height;
        Renderer.drawHandCursor(ctx, hx, hy, 25);
        Renderer.drawHandCursor(ctx, hx2, hy2, 25);

        if (!gameOver.current) {
          if (avgY < 0.15) {
            charge.current = Math.min(maxCharge.current, charge.current + 60 * dt);
            chargeRate.current = 60;
          } else if (avgY < 0.3) {
            charge.current = Math.min(maxCharge.current, charge.current + 30 * dt);
            chargeRate.current = 30;
          } else {
            if (charge.current > 20) {
              const blastPower = charge.current;
              charge.current = 0;
              chargeRate.current = 0;
              fireBlast(cx, cy, blastPower);
            } else {
              charge.current = Math.max(0, charge.current - 5 * dt);
              chargeRate.current = 0;
            }
          }
        }
      }

      if (!gameOver.current) {
        const cfg = levelMgr.current.getConfig();
        const hasBoss = cfg.hasBoss && waveCount.current >= 3 && !bossActive.current;
        if (hasBoss) {
          const boss = createEnemy(canvas.width, canvas.height, 1, true);
          boss.size = 60;
          boss.health = 5;
          boss.maxHealth = 5;
          boss.color = '#E53935';
          enemies.current.push(boss);
          bossActive.current = true;
        }

        if (Date.now() - lastSpawn.current > cfg.spawnRate * 600 && enemies.current.length < cfg.entityLimit) {
          const count = 1 + Math.floor(Math.random() * 2);
          for (let i = 0; i < count; i++) {
            enemies.current.push(createEnemy(canvas.width, canvas.height, levelMgr.current.getSpeedMultiplier(), Math.random() < 0.15 + levelMgr.current.currentLevel * 0.03));
          }
          lastSpawn.current = Date.now();
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      for (let i = enemies.current.length - 1; i >= 0; i--) {
        const en = enemies.current[i];
        if (!en.active) { enemies.current.splice(i, 1); continue; }
      en.x += Math.cos(en.angleDir) * en.speed * dt;
      en.y += Math.sin(en.angleDir) * en.speed * dt;
        if (en.x < -60 || en.x > w + 60 || en.y < -60 || en.y > h + 60) {
          en.active = false;
          continue;
        }
        const d = Math.sqrt((en.x - cx) ** 2 + (en.y - cy) ** 2);
        if (d < 40) {
          gameOver.current = true;
          audioManager.playGameOver();
          const report = analyticsService.endSession(score.current, levelMgr.current.currentLevel, combo.current.maxCombo, 0, []);
          onGameEnd({ score: score.current, level: levelMgr.current.currentLevel, maxCombo: combo.current.maxCombo, accuracy: 0, feedback: report.feedback });
        }
      }

      particles.current.update(dt);

      const crystalColor = charge.current >= maxCharge.current ? '#00E676' : charge.current > 50 ? '#FFD740' : '#64B5F6';
      const crystalPulse = Math.sin(Date.now() / 400) * 0.05 + 1;

      Renderer.drawGlow(ctx, cx, cy, 80 * crystalPulse, crystalColor);
      Renderer.drawCircle(ctx, cx, cy, 30 * crystalPulse, crystalColor);

      const chargePct = charge.current / maxCharge.current;
      Renderer.drawProgressBar(ctx, cx - 60, cy + 50, 120, 10, chargePct, crystalColor);

      const chargeText = charge.current >= maxCharge.current ? '⚡ FULL POWER ⚡' : `${Math.round(chargePct * 100)}%`;
      Renderer.drawText(ctx, chargeText, cx, cy + 70, { size: charge.current >= maxCharge.current ? 16 : 13, align: 'center', color: crystalColor });

      if (charge.current >= maxCharge.current) {
        ctx.shadowColor = '#00E676';
        ctx.shadowBlur = 30;
        Renderer.drawCircle(ctx, cx, cy, 40 * crystalPulse, '#00E67640');
        ctx.shadowBlur = 0;
      }

      for (const en of enemies.current) {
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.rotate(Math.atan2(en.vy || 0.1, en.vx || 1));

        const flash = en.hitTime > 0 && Date.now() - en.hitTime < 150;
        ctx.fillStyle = flash ? '#fff' : en.color;
        ctx.shadowColor = en.shielded ? '#FFD740' : en.color;
        ctx.shadowBlur = en.shielded ? 15 : 8;

        ctx.beginPath();
        ctx.moveTo(en.size, 0);
        ctx.lineTo(-en.size / 2, -en.size / 2);
        ctx.lineTo(-en.size / 2, en.size / 2);
        ctx.closePath();
        ctx.fill();

        if (en.shielded) {
          ctx.strokeStyle = '#FFD740';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, en.size + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      }

      particles.current.render(ctx);

      Renderer.drawText(ctx, `Score: ${score.current}`, 16, 16, { size: 20, align: 'left' });
      Renderer.drawText(ctx, `Wave ${levelMgr.current.currentLevel} | Kills: ${kills.current}`, 16, 46, { size: 14, color: '#aaa', align: 'left' });
      if (combo.current.combo >= 3) {
        Renderer.drawText(ctx, `🔥 ${combo.current.combo}x`, canvas.width / 2, 16, { size: 20, align: 'center', color: '#FF6B6B' });
      }

      if (gameOver.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, w, h);
        Renderer.drawText(ctx, '⚔️ Temple Defended ⚔️', w / 2, h / 2 - 40, { size: 34, align: 'center', baseline: 'middle', color: '#FFD740' });
        Renderer.drawText(ctx, `Score: ${score.current} | Kills: ${kills.current} | Wave: ${levelMgr.current.currentLevel}`, w / 2, h / 2 + 10, { size: 18, align: 'center', baseline: 'middle', color: '#ccc' });
      }

      if (score.current !== lastScoreRef.current) { lastScoreRef.current = score.current; onScoreUpdate(score.current); }

      const fb = poseDataRef.current?.feedback ?? [];
      if (fb.length > 0) onFeedback(fb);

      animRef.current = requestAnimationFrame(loop);
    };

    function fireBlast(cx: number, cy: number, power: number) {
      blast(cx, cy, power);
    }

    function blast(cx: number, cy: number, power: number) {
      const blastRadius = 30 + power * 2;
      particles.current.emitBurst(cx, cy, { color: '#FFD740', count: 20, speed: 150, lifetime: 0.6 });
      audioManager.playSuccess();

      for (let i = enemies.current.length - 1; i >= 0; i--) {
        const en = enemies.current[i];
        if (!en.active) continue;
        const d = Math.sqrt((en.x - cx) ** 2 + (en.y - cy) ** 2);
        if (d < blastRadius) {
          if (en.shielded) {
            en.shielded = false;
            en.hitTime = Date.now();
            particles.current.emitBurst(en.x, en.y, { color: '#FFD740', count: 12, speed: 80 });
          } else {
            en.health--;
            en.hitTime = Date.now();
            if (en.health <= 0) {
              en.active = false;
              const mult = combo.current.registerHit();
              score.current += Math.round(50 * mult);
              kills.current++;
              audioManager.playCollect();
              if (mult > 1) audioManager.playCombo();
              particles.current.emitBurst(en.x, en.y, { color: en.color, count: 15, speed: 100 });

              if (en.size >= 55) {
                bossActive.current = false;
                waveCount.current++;
                if (levelMgr.current.nextLevel()) {
                  audioManager.playLevelUp();
                } else {
                  gameOver.current = true;
                  audioManager.playVictory();
                  const report = analyticsService.endSession(score.current, levelMgr.current.currentLevel, combo.current.maxCombo, 100, []);
                  onGameEnd({ score: score.current, level: levelMgr.current.currentLevel, maxCombo: combo.current.maxCombo, accuracy: 100, feedback: report.feedback });
                }
              }
            }
          }
        }
      }

      setTimeout(() => {
        particles.current.emitBurst(cx, cy, { color: '#FF6B6B', count: 15, speed: 120, lifetime: 0.4 });
      }, 100);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [poseDataRef, onScoreUpdate, onGameEnd, onFeedback]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
