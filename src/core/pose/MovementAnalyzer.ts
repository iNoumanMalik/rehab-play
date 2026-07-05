import type { PoseLandmark, MovementData } from '../../types';
import { LANDMARK } from '../../types';

interface PosSample {
  x: number;
  y: number;
  z: number;
  time: number;
}

export class MovementAnalyzer {
  private history: Map<number, PosSample[]> = new Map();
  private readonly sampleRate = 5;
  private frameCount = 0;

  private sample(lm: PoseLandmark[], idx: number): PosSample | null {
    if (idx >= lm.length) return null;
    return { x: lm[idx].x, y: lm[idx].y, z: lm[idx].z, time: performance.now() };
  }

  analyze(lm: PoseLandmark[]): MovementData {
    this.frameCount++;
    const md: MovementData = {
      rightWristVelocity: 0,
      leftWristVelocity: 0,
      rightWristDirection: { dx: 0, dy: 0 },
      leftWristDirection: { dx: 0, dy: 0 },
      rightReachDistance: 0,
      leftReachDistance: 0,
    };

    if (lm.length < 25) return md;

    for (const [idx, key] of [[LANDMARK.RIGHT_WRIST, 'right'], [LANDMARK.LEFT_WRIST, 'left']] as const) {
      const sample = this.sample(lm, idx);
      if (!sample) continue;

      if (!this.history.has(idx)) this.history.set(idx, []);
      const hist = this.history.get(idx)!;
      hist.push(sample);
      if (hist.length > this.sampleRate) hist.shift();

      if (hist.length >= 2) {
        const prev = hist[hist.length - 2];
        const dt = (sample.time - prev.time) / 1000;
        if (dt > 0) {
          const dist = Math.sqrt(
            (sample.x - prev.x) ** 2 + (sample.y - prev.y) ** 2 + (sample.z - prev.z) ** 2,
          );
          if (key === 'right') {
            md.rightWristVelocity = dist / dt;
            md.rightWristDirection = { dx: sample.x - prev.x, dy: sample.y - prev.y };
          } else {
            md.leftWristVelocity = dist / dt;
            md.leftWristDirection = { dx: sample.x - prev.x, dy: sample.y - prev.y };
          }
        }
      }
    }

    const rightWrist = lm[LANDMARK.RIGHT_WRIST];
    const rightShoulder = lm[LANDMARK.RIGHT_SHOULDER];
    const leftWrist = lm[LANDMARK.LEFT_WRIST];
    const leftShoulder = lm[LANDMARK.LEFT_SHOULDER];

    md.rightReachDistance = Math.sqrt(
      (rightWrist.x - rightShoulder.x) ** 2 + (rightWrist.y - rightShoulder.y) ** 2,
    );
    md.leftReachDistance = Math.sqrt(
      (leftWrist.x - leftShoulder.x) ** 2 + (leftWrist.y - leftShoulder.y) ** 2,
    );

    return md;
  }

  reset(): void {
    this.history.clear();
    this.frameCount = 0;
  }
}
