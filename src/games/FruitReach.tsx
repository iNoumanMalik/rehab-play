
import { useEffect, useRef, useState, useCallback } from 'react';
import type { PoseLandmark } from '../types';

interface Fruit {
  id: number;
  x: number;
  y: number;
  type: 'apple' | 'orange' | 'banana' | 'grape';
  collected: boolean;
}

interface FruitReachProps {
  landmarks: PoseLandmark[];
  onScoreUpdate: (score: number) => void;
  onSuccessUpdate: (count: number) => void;
}

export const FruitReach = ({ landmarks, onScoreUpdate, onSuccessUpdate }: FruitReachProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [score, setScore] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);

  const fruitTypes = [
    { type: 'apple' as const, color: '#FF4444' },
    { type: 'orange' as const, color: '#FF9800' },
    { type: 'banana' as const, color: '#FFEB3B' },
    { type: 'grape' as const, color: '#9C27B0' }
  ];

  const spawnFruit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    const newFruit: Fruit = {
      id: Date.now() + Math.random(),
      x: 100 + Math.random() * (canvas.width - 200),
      y: 100 + Math.random() * (canvas.height - 200),
      type: type.type,
      collected: false
    };
    setFruits(prev => [...prev, newFruit]);
  }, []);

  const checkCollision = useCallback((fruit: Fruit, handX: number, handY: number) => {
    const dx = fruit.x - handX;
    const dy = fruit.y - handY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 40 + 30;
  }, []);

  const drawFruit = (ctx: CanvasRenderingContext2D, fruit: Fruit) => {
    const type = fruitTypes.find(t => t.type === fruit.type);
    if (!type) return;

    ctx.beginPath();
    ctx.arc(fruit.x, fruit.y, 40, 0, Math.PI * 2);
    ctx.fillStyle = type.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fruit.x - 10, fruit.y - 10, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(fruit.x, fruit.y - 40);
    ctx.lineTo(fruit.x, fruit.y - 50);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 4;
    ctx.stroke();
  };

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

      if (time - lastSpawnRef.current > 3000) {
        spawnFruit();
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

      setFruits(prev => {
        let newScore = score;
        let newSuccess = successCount;
        const updated = prev
          .map(f => {
            if (f.collected) return f;

            if (checkCollision(f, handX, handY)) {
              newScore += 15;
              newSuccess += 1;
              return { ...f, collected: true };
            }

            return f;
          })
          .filter(f => !f.collected || Date.now() - f.id < 500);

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

      fruits.forEach(f => {
        if (!f.collected) {
          drawFruit(ctx, f);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [landmarks, fruits, score, successCount, spawnFruit, checkCollision, onScoreUpdate, onSuccessUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
};
