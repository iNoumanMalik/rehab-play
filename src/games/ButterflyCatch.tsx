
import { useEffect, useRef, useState, useCallback } from 'react';
import type { PoseLandmark } from '../types';

interface Butterfly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  caught: boolean;
}

interface ButterflyCatchProps {
  landmarks: PoseLandmark[];
  onScoreUpdate: (score: number) => void;
  onSuccessUpdate: (count: number) => void;
}

export const ButterflyCatch = ({ landmarks, onScoreUpdate, onSuccessUpdate }: ButterflyCatchProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [score, setScore] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);

  const colors = ['#FF6B9D', '#C44DFF', '#6EC6FF', '#69F0AE', '#FFD740'];

  const spawnButterfly = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newButterfly: Butterfly = {
      id: Date.now() + Math.random(),
      x: Math.random() * (canvas.width - 60) + 30,
      y: Math.random() * (canvas.height - 60) + 30,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: 40 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      caught: false
    };
    setButterflies(prev => [...prev, newButterfly]);
  }, []);

  const checkCollision = useCallback((butterfly: Butterfly, handX: number, handY: number) => {
    const dx = butterfly.x - handX;
    const dy = butterfly.y - handY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < butterfly.size / 2 + 30;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (time - lastSpawnRef.current > 2000) {
        spawnButterfly();
        lastSpawnRef.current = time;
      }

      let handX = -1000;
      let handY = -1000;
      if (landmarks.length > 16) {
        const wrist = landmarks[15];
        handX = wrist.x * canvas.width;
        handY = wrist.y * canvas.height;

        ctx.beginPath();
        ctx.arc(handX, handY, 30, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      setButterflies(prev => {
        let newScore = score;
        let newSuccess = successCount;
        const updated = prev
          .map(b => {
            if (b.caught) return b;

            let newX = b.x + b.vx;
            let newY = b.y + b.vy;
            let newVx = b.vx;
            let newVy = b.vy;

            if (newX < 0 || newX > canvas.width) newVx *= -1;
            if (newY < 0 || newY > canvas.height) newVy *= -1;

            if (checkCollision({ ...b, x: newX, y: newY }, handX, handY)) {
              newScore += 10;
              newSuccess += 1;
              return { ...b, caught: true };
            }

            return { ...b, x: newX, y: newY, vx: newVx, vy: newVy };
          })
          .filter(b => !b.caught || Date.now() - b.id < 500);

        if (newScore !== score) {
          setScore(newScore);
          onScoreUpdate(newScore);
        }
        if (newSuccess !== successCount) {
          setSuccessCount(newSuccess);
          onSuccessUpdate(newSuccess);
        }

        return updated;
      });

      butterflies.forEach(b => {
        if (!b.caught) {
          const time = Date.now() / 200;
          const wingOffset = Math.sin(time + b.id) * 0.3;

          ctx.save();
          ctx.translate(b.x, b.y);

          ctx.beginPath();
          ctx.ellipse(-b.size / 4, 0, b.size / 3, b.size / 2, wingOffset, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(b.size / 4, 0, b.size / 3, b.size / 2, -wingOffset, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(0, 0, b.size / 10, b.size / 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#333';
          ctx.fill();

          ctx.restore();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [landmarks, butterflies, score, successCount, spawnButterfly, checkCollision, onScoreUpdate, onSuccessUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
};
