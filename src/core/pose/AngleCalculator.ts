import type { PoseLandmark, JointAngles } from '../../types';
import { LANDMARK } from '../../types';

export class AngleCalculator {
  private angle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (m1 === 0 || m2 === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * (180 / Math.PI);
  }

  calculateAll(lm: PoseLandmark[]): JointAngles {
    const get = (idx: number) => lm[idx];

    return {
      rightElbow: this.angle(get(LANDMARK.RIGHT_SHOULDER), get(LANDMARK.RIGHT_ELBOW), get(LANDMARK.RIGHT_WRIST)),
      leftElbow: this.angle(get(LANDMARK.LEFT_SHOULDER), get(LANDMARK.LEFT_ELBOW), get(LANDMARK.LEFT_WRIST)),
      rightShoulder: this.angle(get(LANDMARK.RIGHT_ELBOW), get(LANDMARK.RIGHT_SHOULDER), get(LANDMARK.RIGHT_HIP)),
      leftShoulder: this.angle(get(LANDMARK.LEFT_ELBOW), get(LANDMARK.LEFT_SHOULDER), get(LANDMARK.LEFT_HIP)),
      rightHip: this.angle(get(LANDMARK.RIGHT_SHOULDER), get(LANDMARK.RIGHT_HIP), get(LANDMARK.RIGHT_KNEE)),
      leftHip: this.angle(get(LANDMARK.LEFT_SHOULDER), get(LANDMARK.LEFT_HIP), get(LANDMARK.LEFT_KNEE)),
      rightKnee: this.angle(get(LANDMARK.RIGHT_HIP), get(LANDMARK.RIGHT_KNEE), get(LANDMARK.RIGHT_ANKLE)),
      leftKnee: this.angle(get(LANDMARK.LEFT_HIP), get(LANDMARK.LEFT_KNEE), get(LANDMARK.LEFT_ANKLE)),
      trunkAngle: this.angle(get(LANDMARK.LEFT_SHOULDER), get(LANDMARK.RIGHT_HIP), get(LANDMARK.RIGHT_KNEE)),
    };
  }
}
