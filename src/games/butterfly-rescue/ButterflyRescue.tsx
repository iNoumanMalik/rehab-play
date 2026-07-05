import { useEffect, useRef, useCallback } from 'react';
import type { PoseData } from '../../types';
import { LANDMARK } from '../../types';
import { Entity } from '../../core/engine/Entity';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { ComboSystem } from '../../core/engine/ComboSystem';
import { LevelManager } from '../../core/engine/LevelManager';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { analyticsService } from '../../core/services/AnalyticsService';

interface ButterflyEntity extends Entity {
  size: number;
  color: string;
  caught: boolean;
  caughtTime: number;
  isMoth: boolean;
  wingPhase: number;
}

type Props = {
  poseDataRef: React.RefObject<PoseData | null>;
  onScoreUpdate: (s: number) => void;
  onSuccessUpdate: (c: number) => void;
  onRepetitionsUpdate?: (_c: number) => void;
  onGameEnd: (stats: { score: number; level: number; maxCombo: number; accuracy: number; feedback: string[] }) => void;
  onFeedback: (m: string[]) => void;
  onComboUpdate: (c: number, m: number) => void;
};

const COLORS = ['#FF6B9D', '#C44DFF', '#6EC6FF', '#69F0AE', '#FFD740', '#FF8A65'];

function createButterfly(w: number, h: number, isMoth = false): ButterflyEntity {
  const e = new Entity();
  e.x = Math.random() * (w - 100) + 50;
  e.y = Math.random() * (h - 100) + 50;
  e.vx = (Math.random() - 0.5) * (isMoth ? 4 : 2.5);
  e.vy = (Math.random() - 0.5) * (isMoth ? 4 : 2.5);
  return Object.assign(e, {
    size: isMoth ? 30 + Math.random() * 20 : 35 + Math.random() * 25,
    color: isMoth ? '#8B4513' : COLORS[Math.floor(Math.random() * COLORS.length)],
    caught: false,
    caughtTime: 0,
    isMoth,
    wingPhase: Math.random() * Math.PI * 2,
  });
}

export function ButterflyRescue({
  poseDataRef, onScoreUpdate, onSuccessUpdate, onGameEnd, onFeedback, onComboUpdate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const butterflies = useRef<ButterflyEntity[]>([]);
  const particles = useRef(new ParticleSystem());
  const combo = useRef(new ComboSystem());
  const levelMgr = useRef(new LevelManager());
  const score = useRef(0);
  const success = useRef(0);
  const health = useRef(100);
  const elapsed = useRef(0);
  const lastSpawn = useRef(0);
  const lastComboScore = useRef(0);
  const lastSuccessScore = useRef(0);
  const feedbackShown = useRef<string[]>([]);
  const sessionStarted = useRef(false);
  const gameOver = useRef(false);

  useEffect(() => {
    analyticsService.startSession('butterfly-rescue');
    sessionStarted.current = true;
  }, []);

  const spawn = useCallback((w: number, h: number) => {
    const cfg = levelMgr.current.getConfig();
    const active = butterflies.current.filter(b => b.active).length;
    if (active >= cfg.entityLimit) return;
    const isMoth = Math.random() < 0.2 + levelMgr.current.currentLevel * 0.03;
    const count = isMoth ? 1 : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      butterflies.current.push(createButterfly(w, h, isMoth));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (time: number) => {
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) resize();

      Renderer.clear(ctx, canvas.width, canvas.height);

      const dt = 1 / 60;
      elapsed.current += dt;

      if (!gameOver.current) {
        combo.current.update(dt);
      }

      const lm = poseDataRef.current?.smoothLandmarks ?? [];
      let hx = -1000, hy = -1000, hx2 = -1000, hy2 = -1000;
      if (lm.length > 16) {
        const w1 = lm[LANDMARK.RIGHT_WRIST];
        hx = (1 - w1.x) * canvas.width;
        hy = w1.y * canvas.height;
        const w2 = lm[LANDMARK.LEFT_WRIST];
        hx2 = (1 - w2.x) * canvas.width;
        hy2 = w2.y * canvas.height;
        Renderer.drawHandCursor(ctx, hx, hy);
        Renderer.drawHandCursor(ctx, hx2, hy2);
      }

      const cfg = levelMgr.current.getConfig();
      if (time - lastSpawn.current > cfg.spawnRate * 700 && !gameOver.current) {
        spawn(canvas.width, canvas.height);
        lastSpawn.current = time;
      }

      const speedMul = levelMgr.current.getSpeedMultiplier();

      const bflies = butterflies.current;
      for (let i = bflies.length - 1; i >= 0; i--) {
        const b = bflies[i];
        if (!b.active) { bflies.splice(i, 1); continue; }
        if (b.caught) {
          if (Date.now() - b.caughtTime > 500) { bflies.splice(i, 1); }
          continue;
        }

        b.wingPhase += dt * 6;
        b.x += b.vx * speedMul;
        b.y += b.vy * speedMul;
        b.x += Math.sin(Date.now() / 500 + b.wingPhase) * 0.5;
        b.y += Math.cos(Date.now() / 700 + b.wingPhase) * 0.3;

        if (b.x < 0 || b.x > canvas.width) b.vx *= -1;
        if (b.y < 0 || b.y > canvas.height) b.vy *= -1;

        const dist = b.size / 2 + 25;
        const d1 = Math.sqrt((b.x - hx) ** 2 + (b.y - hy) ** 2);
        const d2 = Math.sqrt((b.x - hx2) ** 2 + (b.y - hy2) ** 2);

        if (d1 < dist || d2 < dist) {
          if (b.isMoth) {
            health.current = Math.max(0, health.current - 15);
            audioManager.playHit();
            particles.current.emitBurst(b.x, b.y, { color: '#ff4444', count: 8, speed: 60 });
            if (health.current <= 0) {
              gameOver.current = true;
              audioManager.playGameOver();
              const report = analyticsService.endSession(score.current, levelMgr.current.currentLevel, combo.current.maxCombo, 0, []);
              onGameEnd({ score: score.current, level: levelMgr.current.currentLevel, maxCombo: combo.current.maxCombo, accuracy: 0, feedback: report.feedback });
            }
          } else {
            b.caught = true;
            b.caughtTime = Date.now();
            const mult = combo.current.registerHit();
            const points = Math.round(10 * mult);
            score.current += points;
            success.current += 1;
            audioManager.playCollect();
            if (mult > 1) audioManager.playCombo();
            particles.current.emitBurst(b.x, b.y, { color: b.color, count: 12, speed: 80 });
            onComboUpdate(combo.current.combo, mult);
          }
        }
      }

      particles.current.update(dt);
      particles.current.render(ctx);

      for (const b of bflies) {
        const fl = Math.sin(Date.now() / 150 + b.wingPhase) * 0.25;
        const s = b.size;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.sin(Date.now() / 800 + b.wingPhase) * 0.1);

        if (b.isMoth) {
          ctx.fillStyle = '#5D4037';
          ctx.beginPath();
          ctx.ellipse(0, 0, s / 2.5, s / 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8D6E63';
          ctx.beginPath();
          ctx.ellipse(-s / 5, -s / 6, s / 5, s / 4, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(s / 5, -s / 6, s / 5, s / 4, -0.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(-s / 4, 0, s / 3, s / 2.5 + Math.abs(fl) * s / 4, fl, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(s / 4, 0, s / 3, s / 2.5 + Math.abs(fl) * s / 4, -fl, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.ellipse(0, 0, s / 10, s / 4.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#2c2c2c';
        ctx.fill();

        ctx.restore();
      }

      Renderer.drawText(ctx, `Score: ${score.current}`, 16, 16, { size: 20, align: 'left' });
      Renderer.drawText(ctx, `Combo: ${combo.current.combo}x (${combo.current.getMultiplier()}x)`, 16, 44, { size: 14, color: combo.current.combo >= 3 ? '#FFD740' : '#aaa', align: 'left' });
      Renderer.drawText(ctx, `Level ${levelMgr.current.currentLevel}: ${cfg.name}`, 16, canvas.height - 50, { size: 14, color: '#88ccff', align: 'left' });

      Renderer.drawText(ctx, `❤️ ${health.current}%`, canvas.width - 16, 16, { size: 18, align: 'right' });

      if (gameOver.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        Renderer.drawText(ctx, 'Session Complete!', canvas.width / 2, canvas.height / 2 - 40, { size: 36, align: 'center', baseline: 'middle', color: '#FFD740' });
        Renderer.drawText(ctx, `Score: ${score.current}  |  Combo: ${combo.current.maxCombo}x  |  Level: ${levelMgr.current.currentLevel}`, canvas.width / 2, canvas.height / 2 + 10, { size: 18, align: 'center', baseline: 'middle', color: '#ccc' });
      }

      if (score.current !== lastComboScore.current) {
        lastComboScore.current = score.current;
        onScoreUpdate(score.current);
      }
      if (success.current !== lastSuccessScore.current) {
        lastSuccessScore.current = success.current;
        onSuccessUpdate(success.current);
      }

      const fb = poseDataRef.current?.feedback ?? [];
      if (fb.length > 0 && fb[0] !== feedbackShown.current[0]) {
        feedbackShown.current = fb;
        onFeedback(fb);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [spawn, poseDataRef, onScoreUpdate, onSuccessUpdate, onGameEnd, onFeedback, onComboUpdate]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
