import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameId, PoseData } from '../../types';
import { GameEngine } from '../../core/engine/GameEngine';
import { Renderer } from '../../core/engine/Renderer';
import type { Scene, SceneState } from '../../core/engine/Scene';
import {
  ExerciseEngine, Calibration, CalibrationSession, upperBodyTracked, wristToScreen,
} from '../../core/exercise';
import type { ExerciseFrame } from '../../core/exercise';
import { audioManager } from '../../core/services/AudioManager';
import { analyticsService } from '../../core/services/AnalyticsService';
import { getGameRegistration } from '../../games/gameRegistry';
import { CalibrationOverlay } from './CalibrationOverlay';

interface GameRunnerProps {
  gameId: GameId;
  poseDataRef: React.RefObject<PoseData | null>;
  onScoreUpdate: (score: number) => void;
  onSuccessUpdate: (count: number) => void;
  onRepetitionsUpdate: (count: number) => void;
  onComboUpdate: (combo: number, multiplier: number) => void;
  onFeedback: (messages: string[]) => void;
  onGameEnd: (data: { score: number; level: number; maxCombo: number; accuracy: number; feedback: string[] }) => void;
}

type Phase = 'intro' | 'calibrating' | 'playing';

const EMPTY_STATE: SceneState = {
  score: 0, success: 0, reps: 0, combo: 0, multiplier: 1, maxCombo: 0,
  level: 1, accuracy: 100, feedback: [], over: false, won: false,
};

/**
 * One component runs any game: it wires the shared loop (GameEngine, real dt),
 * the per-user calibration flow, the ExerciseEngine (form-checked frames), and
 * the active Scene — then reports Scene state upward through the existing
 * session handlers. Adding a game requires no changes here.
 */
export function GameRunner(props: GameRunnerProps) {
  const { gameId, poseDataRef } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const registration = useMemo(() => getGameRegistration(gameId), [gameId]);
  const calibration = useMemo(() => new Calibration(gameId), [gameId]);
  const exercise = useMemo(
    () => new ExerciseEngine(registration.exercise, calibration),
    [registration, calibration],
  );

  const [phase, setPhase] = useState<Phase>('intro');
  const [calibUI, setCalibUI] = useState({ prompt: '', progress: 0, capturing: false, tracked: true });

  // Mutable loop state (read inside the stable rAF closures).
  const phaseRef = useRef<Phase>('intro');
  const sceneRef = useRef<Scene | null>(null);
  const calibSessionRef = useRef<CalibrationSession | null>(null);
  const lastEffortRef = useRef(0);
  const lastStateRef = useRef<SceneState>(EMPTY_STATE);
  const lastFeedbackRef = useRef<string>('');
  const frameCountRef = useRef(0);
  const endedRef = useRef(false);
  const sceneSizeRef = useRef({ w: 0, h: 0 });

  const startPlaying = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = registration.createScene();
    scene.init(canvas.width, canvas.height);
    sceneSizeRef.current = { w: canvas.width, h: canvas.height };
    sceneRef.current = scene;
    exercise.reset();
    lastStateRef.current = EMPTY_STATE;
    endedRef.current = false;
    analyticsService.startSession(gameId);
    phaseRef.current = 'playing';
    setPhase('playing');
  };

  const beginCalibration = () => {
    audioManager.init();
    const { neutralPrompt, maxPrompt } = registration.exercise.calibration;
    calibSessionRef.current = new CalibrationSession(neutralPrompt, maxPrompt);
    phaseRef.current = 'calibrating';
    setPhase('calibrating');
  };

  const useSavedCalibration = () => {
    audioManager.init();
    startPlaying();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine();

    const update = (dt: number) => {
      const pose = poseDataRef.current;
      const lm = pose?.smoothLandmarks ?? [];
      const tracked = pose != null && upperBodyTracked(lm);

      if (phaseRef.current === 'calibrating') {
        const session = calibSessionRef.current;
        if (!session) return;
        const effort = tracked ? registration.exercise.effort(lm) : lastEffortRef.current;
        lastEffortRef.current = effort;
        session.update(effort, dt);
        setCalibUI({ prompt: session.prompt, progress: session.stepProgress, capturing: session.capturing, tracked });
        if (session.done) {
          calibration.set(session.neutral, session.max, new Date().toISOString());
          startPlaying();
        }
        return;
      }

      if (phaseRef.current !== 'playing') return;
      const scene = sceneRef.current;
      if (!scene) return;

      if (canvas.width !== sceneSizeRef.current.w || canvas.height !== sceneSizeRef.current.h) {
        scene.resize(canvas.width, canvas.height);
        sceneSizeRef.current = { w: canvas.width, h: canvas.height };
      }

      const frame = exercise.process(pose, dt);
      scene.update(dt, frame, pose);

      frameCountRef.current++;
      if (pose && frameCountRef.current % 6 === 0) {
        analyticsService.recordFrame(pose.angles, pose.movement);
      }

      emitState(scene.getState(), frame);
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      if (phaseRef.current === 'playing' && sceneRef.current) {
        sceneRef.current.render(ctx);
        return;
      }
      // Calibration / intro: clear + show live hand markers so tracking is visible.
      Renderer.clear(ctx, canvas.width, canvas.height);
      const pose = poseDataRef.current;
      const lm = pose?.smoothLandmarks ?? [];
      if (upperBodyTracked(lm)) {
        for (const side of ['left', 'right'] as const) {
          const p = wristToScreen(lm, side, canvas.width, canvas.height);
          Renderer.drawHandCursor(ctx, p.x, p.y, 22);
        }
      }
    };

    const emitState = (s: SceneState, frame: ExerciseFrame) => {
      const prev = lastStateRef.current;
      if (s.score !== prev.score) props.onScoreUpdate(s.score);
      if (s.success !== prev.success) props.onSuccessUpdate(s.success);
      if (s.reps !== prev.reps) props.onRepetitionsUpdate(s.reps);
      if (s.combo !== prev.combo || s.multiplier !== prev.multiplier) props.onComboUpdate(s.combo, s.multiplier);

      const feedback = s.feedback.length ? s.feedback : frame.coach ? [frame.coach.text] : [];
      const feedbackKey = feedback[0] ?? '';
      if (feedbackKey !== lastFeedbackRef.current) {
        lastFeedbackRef.current = feedbackKey;
        props.onFeedback(feedback);
      }

      if ((s.over || s.won) && !endedRef.current) {
        endedRef.current = true;
        const report = analyticsService.endSession(s.score, s.level, s.maxCombo, s.accuracy, feedback);
        props.onGameEnd({ score: s.score, level: s.level, maxCombo: s.maxCombo, accuracy: s.accuracy, feedback: report.feedback });
      }
      lastStateRef.current = s;
    };

    engine.start(canvas, update, render);
    return () => engine.stop();
    // Loop closures read live values via refs; deps intentionally minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedFresh = calibration.isCalibrated() && calibration.isFresh();

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {phase === 'intro' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-sm text-center px-6">
          <div className="max-w-md">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">{registration.exercise.name}</h3>
            <p className="text-violet-200/90 text-sm font-semibold mb-1">🎯 {registration.exercise.rehabFocus}</p>
            <p className="text-white/70 text-sm leading-relaxed">
              We'll quickly measure your range of motion so the game adapts to you — only clean, correct movements will score.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={beginCalibration}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold rounded-2xl border border-violet-500/40 shadow-lg transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50"
            >
              {savedFresh ? '📏 Recalibrate' : '📏 Calibrate & Start'}
            </button>
            {savedFresh && (
              <button
                onClick={useSavedCalibration}
                className="px-8 py-4 bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold rounded-2xl border border-white/[0.12] transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              >
                ▶ Use my saved range
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'calibrating' && (
        <CalibrationOverlay
          prompt={calibUI.prompt}
          stepProgress={calibUI.progress}
          capturing={calibUI.capturing}
          tracked={calibUI.tracked}
        />
      )}
    </>
  );
}
