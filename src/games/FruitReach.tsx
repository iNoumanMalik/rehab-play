
import { useEffect, useRef } from 'react';
import type { PoseLandmark } from '../types';
import { LANDMARK_RIGHT_WRIST, LANDMARK_LEFT_WRIST } from '../types';

interface Fruit {
  id: number;
  x: number;
  y: number;
  type: 'apple' | 'orange' | 'banana' | 'grape';
  collected: boolean;
  collectedTime: number;
}

interface FruitReachProps {
  landmarks: PoseLandmark[];
  onScoreUpdate: (score: number) => void;
  onSuccessUpdate: (count: number) => void;
}

const FRUIT_TYPES = [
  { type: 'apple' as const, color: '#FF4444', inner: '#CC0000', label: '🍎' },
  { type: 'orange' as const, color: '#FF9800', inner: '#E65100', label: '🍊' },
  { type: 'banana' as const, color: '#FFEB3B', inner: '#F9A825', label: '🍌' },
  { type: 'grape' as const, color: '#9C27B0', inner: '#6A1B9A', label: '🍇' },
];

export const FruitReach = ({ landmarks, onScoreUpdate, onSuccessUpdate }: FruitReachProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const fruitsRef = useRef<Fruit[]>([]);
  const scoreRef = useRef(0);
  const successRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const lastScoreRef = useRef(0);
  const lastSuccessRef = useRef(0);
  const landmarksRef = useRef(landmarks);

  useEffect(() => {
    landmarksRef.current = landmarks;
  });

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

    const spawnFruit = () => {
      const typeInfo = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
      const f: Fruit = {
        id: Date.now() + Math.random(),
        x: 80 + Math.random() * (canvas.width - 160),
        y: 80 + Math.random() * (canvas.height - 160),
        type: typeInfo.type,
        collected: false,
        collectedTime: 0,
      };
      fruitsRef.current.push(f);
    };

    const drawFruit = (f: Fruit) => {
      const typeInfo = FRUIT_TYPES.find(t => t.type === f.type);
      if (!typeInfo) return;

      const pulse = Math.sin(Date.now() / 300 + f.id) * 3;

      ctx.save();
      ctx.beginPath();
      ctx.arc(f.x, f.y + pulse, 35, 0, Math.PI * 2);
      ctx.fillStyle = typeInfo.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(f.x - 8, f.y - 10 + pulse, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(f.x, f.y - 35 + pulse);
      ctx.lineTo(f.x + 3, f.y - 48 + pulse);
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.font = '28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typeInfo.label, f.x, f.y + pulse + 2);
      ctx.restore();
    };

    const loop = () => {
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const lm = landmarksRef.current;
      let handX = -1000;
      let handY = -1000;
      let handX2 = -1000;
      let handY2 = -1000;

      if (lm.length > 16) {
        const wrist = lm[LANDMARK_RIGHT_WRIST];
        handX = (1 - wrist.x) * canvas.width;
        handY = wrist.y * canvas.height;
        const wrist2 = lm[LANDMARK_LEFT_WRIST];
        handX2 = (1 - wrist2.x) * canvas.width;
        handY2 = wrist2.y * canvas.height;

        const drawHand = (hx: number, hy: number) => {
          ctx.beginPath();
          ctx.arc(hx, hy, 30, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
        };
        drawHand(handX, handY);
        drawHand(handX2, handY2);
      }

      if (Date.now() - lastSpawnRef.current > 2500) {
        if (fruitsRef.current.filter(f => !f.collected).length < 8) {
          spawnFruit();
        }
        lastSpawnRef.current = Date.now();
      }

      const fruits = fruitsRef.current;
      for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        if (f.collected) {
          if (Date.now() - f.collectedTime > 500) {
            fruits.splice(i, 1);
          }
          continue;
        }

        const dist = 40 + 30;
        let collected = false;
        const dx = f.x - handX;
        const dy = f.y - handY;
        if (Math.sqrt(dx * dx + dy * dy) < dist) collected = true;

        if (!collected) {
          const dx2 = f.x - handX2;
          const dy2 = f.y - handY2;
          if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < dist) collected = true;
        }

        if (collected) {
          f.collected = true;
          f.collectedTime = Date.now();
          scoreRef.current += 15;
          successRef.current += 1;
        }
      }

      for (const f of fruits) {
        if (f.collected) {
          const alpha = Math.max(0, 1 - (Date.now() - f.collectedTime) / 500);
          ctx.globalAlpha = alpha;
        }
        drawFruit(f);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${scoreRef.current}`, 20, 40);

      if (scoreRef.current !== lastScoreRef.current) {
        lastScoreRef.current = scoreRef.current;
        onScoreUpdate(scoreRef.current);
      }
      if (successRef.current !== lastSuccessRef.current) {
        lastSuccessRef.current = successRef.current;
        onSuccessUpdate(successRef.current);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [onScoreUpdate, onSuccessUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
};
