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
  
  // Track raised state and hold start times separately for left and right arms
  const rightArmRaisedRef = useRef(false);
  const leftArmRaisedRef = useRef(false);
  const rightHoldStartRef = useRef(0);
  const leftHoldStartRef = useRef(0);
  
  const landmarksRef = useRef(landmarks);

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
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

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
        const lAngle = calcAngle(lShoulder, lElbow, lWrist);

        const rWristY = rWrist.y * canvas.height;
        const lWristY = lWrist.y * canvas.height;
        const targetY = canvas.height * 0.15;

        // Repetition tracking for right arm
        const isRightRaised = rWristY < targetY;
        const isRightLowered = rWristY > targetY + 80;

        if (isRightRaised && !rightArmRaisedRef.current) {
          rightArmRaisedRef.current = true;
          rightHoldStartRef.current = Date.now();
        } else if (isRightLowered && rightArmRaisedRef.current) {
          if (Date.now() - rightHoldStartRef.current > 300) {
            repsRef.current += 1;
            scoreRef.current += 20;
            onRepetitionsUpdate(repsRef.current);
            onScoreUpdate(scoreRef.current);
          }
          rightArmRaisedRef.current = false;
        }

        // Repetition tracking for left arm
        const isLeftRaised = lWristY < targetY;
        const isLeftLowered = lWristY > targetY + 80;

        if (isLeftRaised && !leftArmRaisedRef.current) {
          leftArmRaisedRef.current = true;
          leftHoldStartRef.current = Date.now();
        } else if (isLeftLowered && leftArmRaisedRef.current) {
          if (Date.now() - leftHoldStartRef.current > 300) {
            repsRef.current += 1;
            scoreRef.current += 20;
            onRepetitionsUpdate(repsRef.current);
            onScoreUpdate(scoreRef.current);
          }
          leftArmRaisedRef.current = false;
        }

        // Draw target line
        const grad = ctx.createLinearGradient(0, targetY, canvas.width, targetY);
        grad.addColorStop(0, 'rgba(76, 175, 80, 0.3)');
        grad.addColorStop(0.5, 'rgba(76, 175, 80, 0.7)');
        grad.addColorStop(1, 'rgba(76, 175, 80, 0.3)');
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(canvas.width, targetY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target Line Label
        ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('TARGET HEIGHT', canvas.width - 20, targetY - 8);

        // Helper function to draw mirrored skeleton
        const drawSkeleton = (shoulder: PoseLandmark, elbow: PoseLandmark, wrist: PoseLandmark, color: string) => {
          const sX = (1 - shoulder.x) * canvas.width;
          const sY = shoulder.y * canvas.height;
          const eX = (1 - elbow.x) * canvas.width;
          const eY = elbow.y * canvas.height;
          const wX = (1 - wrist.x) * canvas.width;
          const wY = wrist.y * canvas.height;
          const wYNorm = wrist.y;

          const isAbove = wYNorm < 0.15;
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

          // Shoulder
          ctx.beginPath();
          ctx.arc(sX, sY, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#FF5252';
          ctx.fill();

          // Elbow
          ctx.beginPath();
          ctx.arc(eX, eY, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#FF9800';
          ctx.fill();

          // Wrist
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

        // Draw skeletons (mirroring ensures left/right labels align with the user visually)
        // MediaPipe left wrist is index 15, right wrist is 16.
        // We draw the user's right side (from the camera's perspective, this is drawn on screen left)
        drawSkeleton(rShoulder, rElbow, rWrist, '#64B5F6');
        drawSkeleton(lShoulder, lElbow, lWrist, '#EF5350');

        ctx.shadowBlur = 0;

        const repText = `Repetitions: ${repsRef.current}`;
        const angleText = `Right Angle: ${Math.round(rAngle)}° | Left Angle: ${Math.round(lAngle)}°`;

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(repText, 20, 40);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText(angleText, 20, 70);

        // Display hold progress for whichever arms are currently raised
        const holds = [];
        if (rightArmRaisedRef.current) {
          const elapsed = Math.min(1, (Date.now() - rightHoldStartRef.current) / 300);
          holds.push(`Right Arm: ${Math.round(elapsed * 100)}%`);
        }
        if (leftArmRaisedRef.current) {
          const elapsed = Math.min(1, (Date.now() - leftHoldStartRef.current) / 300);
          holds.push(`Left Arm: ${Math.round(elapsed * 100)}%`);
        }

        if (holds.length > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = 'bold 16px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Hold... ${holds.join(' | ')}`, canvas.width / 2, canvas.height - 40);
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
