
import { useEffect, useRef, useState, useCallback } from 'react';
import type { PoseLandmark } from '../types';

interface ArmRaiseExerciseProps {
  landmarks: PoseLandmark[];
  onScoreUpdate: (score: number) => void;
  onRepetitionsUpdate: (count: number) => void;
}

export const ArmRaiseExercise = ({ landmarks, onScoreUpdate, onRepetitionsUpdate }: ArmRaiseExerciseProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [repetitions, setRepetitions] = useState(0);
  const [armState, setArmState] = useState<'down' | 'up'>('down');
  const animationRef = useRef<number | null>(null);

  const calculateAngle = (p1: PoseLandmark, p2: PoseLandmark, p3: PoseLandmark) => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    return angle;
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

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (landmarks.length > 16) {
        const shoulder = landmarks[11];
        const elbow = landmarks[13];
        const wrist = landmarks[15];

        const angle = calculateAngle(shoulder, elbow, wrist);

        const targetY = canvas.height * 0.2;
        const currentY = wrist.y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(canvas.width, targetY);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.setLineDash([]);

        const sX = shoulder.x * canvas.width;
        const sY = shoulder.y * canvas.height;
        const eX = elbow.x * canvas.width;
        const eY = elbow.y * canvas.height;
        const wX = wrist.x * canvas.width;
        const wY = wrist.y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(sX, sY);
        ctx.lineTo(eX, eY);
        ctx.lineTo(wX, wY);
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sX, sY, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#FF5722';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eX, eY, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#FF9800';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(wX, wY, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#FFEB3B';
        ctx.fill();

        if (currentY < targetY && armState === 'down') {
          setArmState('up');
          setRepetitions(prev => prev + 1);
          setScore(prev => prev + 20);
          onRepetitionsUpdate(repetitions + 1);
          onScoreUpdate(score + 20);
        } else if (currentY > targetY + 50 && armState === 'up') {
          setArmState('down');
        }

        ctx.font = 'bold 32px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`Repetitions: ${repetitions}`, canvas.width / 2, 80);
        ctx.fillText(`Angle: ${Math.round(angle)}°`, canvas.width / 2, 130);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [landmarks, armState, repetitions, score, onScoreUpdate, onRepetitionsUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
};
