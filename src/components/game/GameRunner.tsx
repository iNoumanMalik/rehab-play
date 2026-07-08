import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameId, PoseData } from '../../types';
import { GameEngine } from '../../core/engine/GameEngine';
import { Renderer } from '../../core/engine/Renderer';
import { MotionOverlay, type MotionOverlayInput } from '../../core/engine/MotionOverlay';
import type { Scene, SceneState } from '../../core/engine/Scene';
import { ExerciseEngine, Calibration, CalibrationSession, upperBodyTracked } from '../../core/exercise';
import type { ExerciseFrame } from '../../core/exercise';
import { audioManager } from '../../core/services/AudioManager';
import { analyticsService } from '../../core/services/AnalyticsService';
import { settingsStore } from '../../core/services/SettingsStore';
import { getGameRegistration } from '../../games/gameRegistry';
import { CalibrationOverlay } from './CalibrationOverlay';
import { HUD } from './HUD';
import { ObjectiveBanner } from './ObjectiveBanner';
import type { GameSessionHandlers, GameEndPayload } from '../../hooks/useGameSession';

interface GameRunnerProps extends GameSessionHandlers {
  gameId: GameId;
  poseDataRef: React.RefObject<PoseData | null>;
  onQuit: () => void;
}

type Phase = 'intro' | 'calibrating' | 'playing';

const EMPTY_STATE: SceneState = {
  score: 0, success: 0, reps: 0, combo: 0, multiplier: 1, maxCombo: 0,
  level: 1, accuracy: 100, feedback: [], over: false, won: false,
};

const NEUTRAL_OVERLAY_INPUT = (pose: PoseData | null, tracked: boolean): MotionOverlayInput => ({
  pose, tracked, quality: 1, compensating: false, guidance: null, successPulse: false,
});

/**
 * One component runs any game: it wires the shared loop (GameEngine, real dt),
 * the per-user calibration flow, the ExerciseEngine (form-checked frames), the
 * active Scene, and the MotionOverlay (the player's own body as a game
 * element) — then reports Scene state upward through the existing session
 * handlers. Adding a game requires no changes here.
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
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [hud, setHud] = useState<{ elapsedSec: number; health: SceneState['health'] | null }>({ elapsedSec: 0, health: null });
  const [objective, setObjective] = useState('');

  // Mutable loop state (read inside the stable rAF closures).
  const phaseRef = useRef<Phase>('intro');
  const sceneRef = useRef<Scene | null>(null);
  const calibSessionRef = useRef<CalibrationSession | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const overlayRef = useRef(new MotionOverlay());
  const overlayInputRef = useRef<MotionOverlayInput | null>(null);
  const lastEffortRef = useRef(0);
  const lastStateRef = useRef<SceneState>(EMPTY_STATE);
  const lastFeedbackRef = useRef<string>('');
  const lastObjectiveRef = useRef('');
  const frameCountRef = useRef(0);
  const hudTickRef = useRef(0);
  const elapsedRef = useRef(0);
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
    overlayRef.current.reset();
    lastStateRef.current = EMPTY_STATE;
    lastObjectiveRef.current = '';
    elapsedRef.current = 0;
    endedRef.current = false;
    setOver(false);
    setObjective('');
    setHud({ elapsedSec: 0, health: null });
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

  const togglePause = () => {
    if (phaseRef.current !== 'playing' || endedRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.paused) {
      engine.resume();
      setPaused(false);
    } else {
      engine.pause();
      setPaused(true);
    }
  };

  // Escape toggles pause during play, for keyboard-only players.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine();
    engineRef.current = engine;

    const update = (dt: number) => {
      const pose = poseDataRef.current;
      const lm = pose?.smoothLandmarks ?? [];
      const tracked = pose != null && upperBodyTracked(lm);
      overlayRef.current.setReducedMotion(settingsStore.get().reducedMotion);

      if (phaseRef.current === 'calibrating') {
        const session = calibSessionRef.current;
        if (session) {
          const effort = tracked ? registration.exercise.effort(lm) : lastEffortRef.current;
          lastEffortRef.current = effort;
          session.update(effort, dt);
          setCalibUI({ prompt: session.prompt, progress: session.stepProgress, capturing: session.capturing, tracked });
          if (session.done) {
            calibration.set(session.neutral, session.max, new Date().toISOString());
            startPlaying();
            return; // defer the first "playing" tick to the next frame
          }
        }
      }

      if (phaseRef.current !== 'playing') {
        const input = NEUTRAL_OVERLAY_INPUT(pose, tracked);
        overlayRef.current.update(dt, input, canvas.width, canvas.height);
        overlayInputRef.current = input;
        return;
      }

      const scene = sceneRef.current;
      if (!scene) return;

      if (canvas.width !== sceneSizeRef.current.w || canvas.height !== sceneSizeRef.current.h) {
        scene.resize(canvas.width, canvas.height);
        sceneSizeRef.current = { w: canvas.width, h: canvas.height };
      }

      const frame = exercise.process(pose, dt);
      scene.update(dt, frame, pose);
      elapsedRef.current += dt;

      frameCountRef.current++;
      if (pose && frameCountRef.current % 6 === 0) {
        analyticsService.recordFrame(pose.angles, pose.movement);
      }

      const s = scene.getState();
      emitState(s, frame);

      const overlayInput: MotionOverlayInput = {
        pose, tracked: frame.tracked, quality: frame.quality,
        compensating: frame.compensations.length > 0,
        guidance: s.guidance ?? null,
        successPulse: Boolean(s.successPulse) || Boolean(frame.rep?.valid),
      };
      overlayRef.current.update(dt, overlayInput, canvas.width, canvas.height);
      overlayInputRef.current = overlayInput;

      const objectiveText = s.objective ?? '';
      if (objectiveText !== lastObjectiveRef.current) {
        lastObjectiveRef.current = objectiveText;
        setObjective(objectiveText);
      }

      hudTickRef.current++;
      if (hudTickRef.current % 12 === 0) {
        setHud({ elapsedSec: Math.floor(elapsedRef.current), health: s.health ?? null });
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      if (phaseRef.current === 'playing' && sceneRef.current) {
        sceneRef.current.render(ctx);
      } else {
        Renderer.clear(ctx, canvas.width, canvas.height);
      }
      const input = overlayInputRef.current;
      if (input) overlayRef.current.render(ctx, input, canvas.width, canvas.height);
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
        setOver(true);
        const report = analyticsService.endSession(s.score, s.level, s.maxCombo, s.accuracy, feedback);
        const payload: GameEndPayload = {
          score: s.score, level: s.level, maxCombo: s.maxCombo, accuracy: s.accuracy,
          feedback: report.feedback, won: s.won, successfulActions: s.success, repetitions: s.reps,
        };
        props.onGameEnd(payload);
      }
      lastStateRef.current = s;
    };

    engine.start(canvas, update, render);
    return () => { engine.stop(); engineRef.current = null; };
    // Loop closures read live values via refs; deps intentionally minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedFresh = calibration.isCalibrated() && calibration.isFresh();

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {phase === 'playing' && !over && (
        <>
          <HUD elapsedSec={hud.elapsedSec} health={hud.health ?? null} paused={paused} onTogglePause={togglePause} />
          <ObjectiveBanner text={objective} />
        </>
      )}

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

      {paused && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-md text-center px-6">
          <h3 className="text-3xl font-extrabold text-white">⏸ Paused</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={togglePause}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold rounded-2xl border border-violet-500/40 shadow-lg transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50"
            >
              ▶ Resume
            </button>
            <button
              onClick={props.onQuit}
              className="px-8 py-4 bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold rounded-2xl border border-white/[0.12] transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              Quit to Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
