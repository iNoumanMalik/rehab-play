import type { PoseLandmark } from '../../types';

export class JointSmoother {
  private history: Map<number, { x: number[]; y: number[]; z: number[] }> = new Map();
  private windowSize: number;
  private readonly maxWindow = 5;

  constructor(windowSize = 3) {
    this.windowSize = Math.min(windowSize, this.maxWindow);
  }

  smooth(landmarks: PoseLandmark[]): PoseLandmark[] {
    return landmarks.map((lm, i) => {
      if (!this.history.has(i)) {
        this.history.set(i, { x: [], y: [], z: [] });
      }
      const h = this.history.get(i)!;
      h.x.push(lm.x);
      h.y.push(lm.y);
      h.z.push(lm.z);
      if (h.x.length > this.windowSize) {
        h.x.shift();
        h.y.shift();
        h.z.shift();
      }
      return {
        x: h.x.reduce((a, b) => a + b, 0) / h.x.length,
        y: h.y.reduce((a, b) => a + b, 0) / h.y.length,
        z: h.z.reduce((a, b) => a + b, 0) / h.z.length,
        visibility: lm.visibility,
      };
    });
  }

  setWindowSize(n: number): void {
    this.windowSize = Math.min(n, this.maxWindow);
  }

  reset(): void {
    this.history.clear();
  }
}
