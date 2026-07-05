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

interface FruitEntity extends Entity {
  id: number;
  type: 'apple' | 'orange' | 'banana' | 'grape' | 'strawberry';
  collected: boolean;
  collectedTime: number;
  wrong: boolean;
  zone: 'low' | 'mid' | 'high';
}

const FRUIT_COLORS: Record<string, { fill: string; glow: string }> = {
  apple: { fill: '#FF4444', glow: '#FF4444' },
  orange: { fill: '#FF9800', glow: '#FF9800' },
  banana: { fill: '#FFEB3B', glow: '#FFEB3B' },
  grape: { fill: '#9C27B0', glow: '#CE93D8' },
  strawberry: { fill: '#E91E63', glow: '#F48FB1' },
};

const FRUIT_EMOJIS: Record<string, string> = {
  apple: '🍎', orange: '🍊', banana: '🍌', grape: '🍇', strawberry: '🍓',
};

const RECIPES = [
  { name: 'Fruit Salad', fruits: ['apple', 'orange', 'banana'], pointsPerFruit: 15 },
  { name: 'Fruit Pie', fruits: ['apple', 'strawberry', 'grape'], pointsPerFruit: 20 },
  { name: 'Smoothie', fruits: ['banana', 'strawberry', 'orange'], pointsPerFruit: 25 },
  { name: 'Fruit Feast', fruits: ['apple', 'orange', 'banana', 'grape', 'strawberry'], pointsPerFruit: 30 },
];

type Props = {
  poseDataRef: React.RefObject<PoseData | null>;
  onScoreUpdate: (s: number) => void;
  onSuccessUpdate: (c: number) => void;
  onRepetitionsUpdate?: (_c: number) => void;
  onGameEnd: (stats: { score: number; level: number; maxCombo: number; accuracy: number; feedback: string[] }) => void;
  onFeedback: (m: string[]) => void;
  onComboUpdate: (c: number, m: number) => void;
};

function createFruit(w: number, h: number, recipeFruits: string[], difficulty: number): FruitEntity {
  const e = new Entity();
  const zoneIdx = Math.floor(Math.random() * 3);
  const zone = ['low', 'mid', 'high'][zoneIdx] as 'low' | 'mid' | 'high';
  const yPositions = { low: h * 0.75, mid: h * 0.5, high: h * 0.2 };
  e.x = 60 + Math.random() * (w - 120);
  e.y = yPositions[zone] + (Math.random() - 0.5) * 30;
  const type = recipeFruits[Math.floor(Math.random() * recipeFruits.length)];
  return Object.assign(e, {
    id: Date.now() + Math.random(),
    type: type as FruitEntity['type'],
    collected: false,
    collectedTime: 0,
    wrong: Math.random() < 0.2 + difficulty * 0.05,
    zone,
  });
}

export function FruitHarvest({
  poseDataRef, onScoreUpdate, onSuccessUpdate, onGameEnd, onFeedback, onComboUpdate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const fruits = useRef<FruitEntity[]>([]);
  const particles = useRef(new ParticleSystem());
  const combo = useRef(new ComboSystem());
  const levelMgr = useRef(new LevelManager());
  const score = useRef(0);
  const success = useRef(0);
  const attempts = useRef(0);
  const elapsed = useRef(0);
  const lastSpawn = useRef(0);
  const lastScoreRef = useRef(0);
  const lastSuccessRef = useRef(0);
  const currentRecipe = useRef(0);
  const collectedInRecipe = useRef(0);
  const feedbackShown = useRef<string[]>([]);
  const gameOver = useRef(false);

  useEffect(() => { analyticsService.startSession('fruit-harvest'); }, []);

  const getRecipe = useCallback(() => {
    const idx = Math.min(currentRecipe.current, RECIPES.length - 1);
    return RECIPES[idx];
  }, []);

  const spawn = useCallback((w: number, h: number) => {
    const cfg = levelMgr.current.getConfig();
    const recipe = getRecipe();
    const active = fruits.current.filter(f => f.active).length;
    if (active >= cfg.entityLimit) return;
    const count = Math.max(1, Math.floor(Math.random() * 3));
    for (let i = 0; i < count; i++) {
      fruits.current.push(createFruit(w, h, recipe.fruits, levelMgr.current.currentLevel));
    }
  }, [getRecipe]);

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

      const lm = poseDataRef.current?.smoothLandmarks ?? [];
      let hx = -1000, hy = -1000, hx2 = -1000, hy2 = -1000;
      if (lm.length > 16) {
        const w1 = lm[LANDMARK.RIGHT_WRIST];
        hx = (1 - w1.x) * canvas.width;
        hy = w1.y * canvas.height;
        const w2 = lm[LANDMARK.LEFT_WRIST];
        hx2 = (1 - w2.x) * canvas.width;
        hy2 = w2.y * canvas.height;
        Renderer.drawHandCursor(ctx, hx, hy, 30);
        Renderer.drawHandCursor(ctx, hx2, hy2, 30);
      }

      const recipe = getRecipe();
      const recipeFruits = recipe.fruits;
      const needed = recipeFruits.length;
      const progress = collectedInRecipe.current / needed;

      Renderer.drawText(ctx, `Recipe: ${recipe.name}`, canvas.width / 2, 14, { size: 18, align: 'center', color: '#FFD740' });
      Renderer.drawText(ctx, `${'🍎'.repeat(collectedInRecipe.current)}${'○'.repeat(needed - collectedInRecipe.current)}`, canvas.width / 2, 40, { size: 16, align: 'center', color: '#aaa' });
      Renderer.drawProgressBar(ctx, 20, canvas.height - 20, canvas.width - 40, 8, progress, '#4CAF50');
      Renderer.drawText(ctx, `Level ${levelMgr.current.currentLevel}`, canvas.width - 16, 50, { size: 14, align: 'right', color: '#88ccff' });
      Renderer.drawText(ctx, `Score: ${score.current}`, 16, 50, { size: 18, align: 'left' });

      if (combo.current.combo >= 3) {
        Renderer.drawText(ctx, `🔥 ${combo.current.combo}x combo!`, canvas.width / 2, 100, { size: 16, align: 'center', color: '#FF6B6B' });
      }

      if (Date.now() - lastSpawn.current > 2500 && !gameOver.current) {
        spawn(canvas.width, canvas.height);
        lastSpawn.current = Date.now();
      }

      for (let i = fruits.current.length - 1; i >= 0; i--) {
        const f = fruits.current[i];
        if (!f.active) { fruits.current.splice(i, 1); continue; }
        if (f.collected) {
          if (Date.now() - f.collectedTime > 500) fruits.current.splice(i, 1);
          continue;
        }

        const pulse = Math.sin(Date.now() / 300 + i) * 3;
        f.y += pulse * 0.1;

        const dist = 40 + 30;
        const d1 = Math.sqrt((f.x - hx) ** 2 + (f.y - hy) ** 2);
        const d2 = Math.sqrt((f.x - hx2) ** 2 + (f.y - hy2) ** 2);

        if (d1 < dist || d2 < dist) {
          attempts.current++;
          f.collected = true;
          f.collectedTime = Date.now();
          if (!f.wrong) {
            const mult = combo.current.registerHit();
            const points = Math.round(recipe.pointsPerFruit * mult);
            score.current += points;
            success.current += 1;
            collectedInRecipe.current++;
            audioManager.playCollect();
            if (mult > 1) audioManager.playCombo();
            particles.current.emitBurst(f.x, f.y, { color: '#69F0AE', count: 10, speed: 70 });
            onComboUpdate(combo.current.combo, mult);

            if (collectedInRecipe.current >= needed) {
              audioManager.playSuccess();
              collectedInRecipe.current = 0;
              if (currentRecipe.current < RECIPES.length - 1) {
                currentRecipe.current++;
                levelMgr.current.nextLevel();
              } else {
                gameOver.current = true;
                audioManager.playVictory();
                const report = analyticsService.endSession(score.current, levelMgr.current.currentLevel, combo.current.maxCombo, Math.round(success.current / Math.max(1, attempts.current) * 100), []);
                onGameEnd({ score: score.current, level: levelMgr.current.currentLevel, maxCombo: combo.current.maxCombo, accuracy: Math.round(success.current / Math.max(1, attempts.current) * 100), feedback: report.feedback });
              }
            }
          } else {
            combo.current.registerMiss();
            score.current = Math.max(0, score.current - 10);
            audioManager.playHit();
            particles.current.emitBurst(f.x, f.y, { color: '#ff4444', count: 8, speed: 50 });
            onComboUpdate(0, 1);
          }
        }
      }

      particles.current.update(dt);
      particles.current.render(ctx);

      for (const f of fruits.current) {
        if (f.collected) {
          ctx.globalAlpha = Math.max(0, 1 - (Date.now() - f.collectedTime) / 500);
        }
        const pulse = Math.sin(Date.now() / 300 + f.id) * 2;
        const colors = FRUIT_COLORS[f.type];
        if (colors) {
          Renderer.drawGlow(ctx, f.x, f.y + pulse, 40, colors.glow);
          Renderer.drawCircle(ctx, f.x, f.y + pulse, 30, colors.fill);
          if (f.wrong) {
            ctx.strokeStyle = 'rgba(255,0,0,0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(f.x, f.y + pulse, 32, 0, Math.PI * 2);
            ctx.stroke();
          }
          const emoji = FRUIT_EMOJIS[f.type] ?? '🍎';
          ctx.font = '24px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(emoji, f.x, f.y + pulse + 1);
        }
        ctx.globalAlpha = 1;
      }

      if (score.current !== lastScoreRef.current) { lastScoreRef.current = score.current; onScoreUpdate(score.current); }
      if (success.current !== lastSuccessRef.current) { lastSuccessRef.current = success.current; onSuccessUpdate(success.current); }

      const fb = poseDataRef.current?.feedback ?? [];
      if (fb.length > 0 && fb[0] !== feedbackShown.current[0]) { feedbackShown.current = fb; onFeedback(fb); }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [spawn, getRecipe, poseDataRef, onScoreUpdate, onSuccessUpdate, onGameEnd, onFeedback, onComboUpdate]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
