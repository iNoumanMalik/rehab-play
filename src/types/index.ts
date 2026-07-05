
export type GameType = 'butterfly' | 'fruit' | 'arm-raise';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface GameStats {
  score: number;
  accuracy: number;
  successfulActions: number;
  repetitions: number;
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  stats: GameStats;
}

export const LANDMARK_LEFT_WRIST = 15;
export const LANDMARK_RIGHT_WRIST = 16;
export const LANDMARK_LEFT_SHOULDER = 11;
export const LANDMARK_RIGHT_SHOULDER = 12;
export const LANDMARK_LEFT_ELBOW = 13;
export const LANDMARK_RIGHT_ELBOW = 14;
export const LANDMARK_LEFT_INDEX = 19;
export const LANDMARK_RIGHT_INDEX = 20;
