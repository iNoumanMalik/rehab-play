import type { PoseData } from '../../types';
import type { ExerciseFrame } from '../exercise/types';

export interface SceneState {
  score: number;
  success: number;
  reps: number;
  combo: number;
  multiplier: number;
  maxCombo: number;
  level: number;
  accuracy: number;
  /** Transient game-event messages (take priority over coaching cues). */
  feedback: string[];
  over: boolean;
  won: boolean;
  /** Present only for games with a health/lives mechanic (shown in the HUD). */
  health?: { current: number; max: number };
  /** Plain-language "what to do right now" for the always-visible objective banner. */
  objective?: string;
  /** On-screen point the MotionOverlay should draw a directional guide toward. */
  guidance?: { x: number; y: number } | null;
  /** True for exactly the tick a correct action registered — triggers the overlay's success flash. */
  successPulse?: boolean;
}

/**
 * A game is a Scene: pure logic + canvas rendering, no React. It consumes a
 * form-checked ExerciseFrame each tick (so only correct movement drives it) and
 * exposes its state for the host to surface. Adding a game = one Scene + one
 * ExerciseDefinition + a registry entry.
 */
export abstract class Scene {
  protected width = 0;
  protected height = 0;

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  abstract update(dt: number, frame: ExerciseFrame, pose: PoseData | null): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
  abstract getState(): SceneState;
}
