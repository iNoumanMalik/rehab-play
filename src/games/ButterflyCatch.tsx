
import { useEffect, useRef } from 'react';
import type { PoseLandmark } from '../types';
import { LANDMARK_RIGHT_WRIST, LANDMARK_LEFT_WRIST } from '../types';

interface Butterfly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  caught: boolean;
  caughtTime: number;
  hue: number;
}

interface ButterflyCatchProps {
  landmarks: PoseLandmark[];
  onScoreUpdate: (score: number) => void;
  onSuccessUpdate: (count: number) => void;
}

const COLORS = ['#FF6B9D', '#C44DFF', '#6EC6FF', '#69F0AE', '#FFD740', '#FF8A65', '#40C4FF'];

export const ButterflyCatch = ({ landmarks, onScoreUpdate, onSuccessUpdate }: ButterflyCatchProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const butterfliesRef = useRef<Butterfly[]>([]);
  const scoreRef = useRef(0);
  const successRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const lastScoreRef = useRef(0);
  const lastSuccessRef = useRef(0);
  const landmarksRef = useRef(landmarks);
  const timeRef = useRef(0);

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

    const spawnButterfly = () => {
      const b: Butterfly = {
        id: Date.now() + Math.random(),
        x: Math.random() * (canvas.width - 80) + 40,
        y: Math.random() * (canvas.height - 80) + 40,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: 35 + Math.random() * 30,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        caught: false,
        caughtTime: 0,
        hue: Math.random() * 360,
      };
      butterfliesRef.current.push(b);
    };

    const loop = (time: number) => {
      timeRef.current = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const lm = landmarksRef.current;
      let handX = -1000;
      let handY = -1000;
      let handX2 = -1000;
      let handY2 = -1000;

      if (lm.length > 16) {
        const wrist = lm[LANDMARK_RIGHT_WRIST];
        handX = wrist.x * canvas.width;
        handY = wrist.y * canvas.height;

        const wrist2 = lm[LANDMARK_LEFT_WRIST];
        handX2 = wrist2.x * canvas.width;
        handY2 = wrist2.y * canvas.height;

        const gradient = ctx.createRadialGradient(handX, handY, 0, handX, handY, 40);
        gradient.addColorStop(0, 'rgba(255,255,255,0.25)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(handX, handY, 40, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const gradient2 = ctx.createRadialGradient(handX2, handY2, 0, handX2, handY2, 40);
        gradient2.addColorStop(0, 'rgba(255,255,255,0.25)');
        gradient2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(handX2, handY2, 40, 0, Math.PI * 2);
        ctx.fillStyle = gradient2;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (time - lastSpawnRef.current > 1500) {
        if (butterfliesRef.current.length < 15) {
          spawnButterfly();
        }
        lastSpawnRef.current = time;
      }

      const butterflies = butterfliesRef.current;
      for (let i = butterflies.length - 1; i >= 0; i--) {
        const b = butterflies[i];
        if (b.caught) {
          if (Date.now() - b.caughtTime > 600) {
            butterflies.splice(i, 1);
          }
          continue;
        }

        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0 || b.x > canvas.width) { b.vx *= -1; b.x = Math.max(0, Math.min(canvas.width, b.x)); }
        if (b.y < 0 || b.y > canvas.height) { b.vy *= -1; b.y = Math.max(0, Math.min(canvas.height, b.y)); }

        const catchDist = b.size / 2 + 30;
        let caught = false;

        const dx = b.x - handX;
        const dy = b.y - handY;
        if (Math.sqrt(dx * dx + dy * dy) < catchDist) caught = true;

        if (!caught) {
          const dx2 = b.x - handX2;
          const dy2 = b.y - handY2;
          if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < catchDist) caught = true;
        }

        if (caught) {
          b.caught = true;
          b.caughtTime = Date.now();
          scoreRef.current += 10;
          successRef.current += 1;
        }
      }

      for (const b of butterflies) {
        if (b.caught) {
          const alpha = Math.max(0, 1 - (Date.now() - b.caughtTime) / 600);
          ctx.globalAlpha = alpha;
        }

        const flutter = Math.sin(Date.now() / 150 + b.id) * 0.3;
        const s = b.size;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.sin(Date.now() / 1000 + b.id) * 0.1);

        ctx.beginPath();
        ctx.ellipse(-s / 4, 0, s / 3, s / 2.5 + Math.abs(flutter) * s / 4, flutter, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(s / 4, 0, s / 3, s / 2.5 + Math.abs(flutter) * s / 4, -flutter, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, 0, s / 10, s / 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#2c2c2c';
        ctx.fill();

        ctx.restore();
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
