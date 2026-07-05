
export type GameType = 'butterfly' | 'fruit' | 'arm-raise';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
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
