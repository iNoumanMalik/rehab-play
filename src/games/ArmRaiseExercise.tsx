
import { useEffect, useRef } from 'react';
import type { PoseLandmark } from '../types';
import {
  LANDMARK_RIGHT_SHOULDER,
  LANDMARK_RIGHT_ELBOW,
  LANDMARK_RIGHT_WRIST,
  LANDMARK_LEFT_SHOULDER,
  LANDMARK_LEFT_ELBOW,
  LANDMARK_LEFT_WRIST,
} from '../types';

interface ArmRaiseExerciseProps {
  landmarks: PoseLandmark[];
  onScoreUpdate: (score: number) => void;
  onRepetitionsUpdate: (count: number) => void;
}

export const ArmRaiseExercise = ({ landmarks, onScoreUpdate, onRepetitionsUpdate }: ArmRaiseExerciseProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const repsRef = useRef(0);
  const lastScoreRef = useRef(0);
  const lastRepsRef = useRef(0);
  const armRaisedRef = useRef(false);
  const landmarksRef = useRef(landmarks);
  const holdStartRef = useRef(0);

  useEffect(() => {
    landmarksRef.current = landmarks;
  });

  const calcAngle = (a: PoseLandmark, b: PoseLandmark, c: PoseLandmark) => {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (m1 === 0 || m2 === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * (180 / Math.PI);
  };

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

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const lm = landmarksRef.current;
      if (lm.length > 20) {
        const rShoulder = lm[LANDMARK_RIGHT_SHOULDER];
        const rElbow = lm[LANDMARK_RIGHT_ELBOW];
        const rWrist = lm[LANDMARK_RIGHT_WRIST];
        const lShoulder = lm[LANDMARK_LEFT_SHOULDER];
        const lElbow = lm[LANDMARK_LEFT_ELBOW];
        const lWrist = lm[LANDMARK_LEFT_WRIST];

        const rAngle = calcAngle(rShoulder, rElbow, rWrist);

        const rWristY = rWrist.y * canvas.height;
        const targetY = canvas.height * 0.15;

        const isRaised = rWristY < targetY;
        const isLowered = rWristY > targetY + 80;

        if (isRaised && !armRaisedRef.current) {
          armRaisedRef.current = true;
          holdStartRef.current = Date.now();
        } else if (isLowered && armRaisedRef.current) {
          if (Date.now() - holdStartRef.current > 300) {
            repsRef.current += 1;
            scoreRef.current += 20;
            lastRepsRef.current = repsRef.current;
            lastScoreRef.current = scoreRef.current;
            onRepetitionsUpdate(repsRef.current);
            onScoreUpdate(scoreRef.current);
          }
          armRaisedRef.current = false;
        }

        const grad = ctx.createLinearGradient(0, targetY, canvas.width, targetY);
        grad.addColorStop(0, 'rgba(76, 175, 80, 0.5)');
        grad.addColorStop(0.5, 'rgba(76, 175, 80, 0.8)');
        grad.addColorStop(1, 'rgba(76, 175, 80, 0.5)');
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(canvas.width, targetY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        const drawSkeleton = (shoulder: PoseLandmark, elbow: PoseLandmark, wrist: PoseLandmark, color: string) => {
          const sX = shoulder.x * canvas.width;
          const sY = shoulder.y * canvas.height;
          const eX = elbow.x * canvas.width;
          const eY = elbow.y * canvas.height;
          const wX = wrist.x * canvas.width;
          const wY = wrist.y * canvas.height;
          const wYNorm = wrist.y;

          const isAbove = wYNorm < 0.2;
          const glowColor = isAbove ? 'rgba(76, 175, 80, 0.6)' : 'rgba(255, 255, 255, 0.1)';

          ctx.shadowColor = glowColor;
          ctx.shadowBlur = isAbove ? 20 : 0;

          ctx.beginPath();
          ctx.moveTo(sX, sY);
          ctx.lineTo(eX, eY);
          ctx.lineTo(wX, wY);
          ctx.strokeStyle = isAbove ? '#4CAF50' : color;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          ctx.shadowBlur = 0;

          ctx.beginPath();
          ctx.arc(sX, sY, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#FF5252';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(eX, eY, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#FF9800';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(wX, wY, 16, 0, Math.PI * 2);
          ctx.fillStyle = isAbove ? '#4CAF50' : '#FFEB3B';
          ctx.fill();

          const statusText = isAbove ? '✓ RAISED' : '— LOWERED';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = isAbove ? 'rgba(76,175,80,0.9)' : 'rgba(255,255,255,0.5)';
          ctx.fillText(statusText, wX, wY - 25);
        };

        drawSkeleton(rShoulder, rElbow, rWrist, '#64B5F6');
        drawSkeleton(lShoulder, lElbow, lWrist, '#EF5350');

        ctx.shadowBlur = 0;

        const repText = `Repetitions: ${repsRef.current}`;
        const angleText = `Angle: ${Math.round(rAngle)}°`;

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(repText, 20, 40);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText(angleText, 20, 70);

        if (armRaisedRef.current) {
          const elapsed = Math.min(1, (Date.now() - holdStartRef.current) / 300);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = 'bold 16px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Hold... ${Math.round(elapsed * 100)}%`, canvas.width / 2, canvas.height - 40);
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Position yourself in frame', canvas.width / 2, canvas.height / 2);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [onScoreUpdate, onRepetitionsUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
};
