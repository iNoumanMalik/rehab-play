import type { PoseLandmark, PoseData, JointAngles, MovementData } from '../../types';
import { JointSmoother } from './JointSmoother';
import { AngleCalculator } from './AngleCalculator';
import { MovementAnalyzer } from './MovementAnalyzer';
import { PostureCoach } from './PostureCoach';

export class PoseEngine {
  private smoother = new JointSmoother(3);
  private angleCalc = new AngleCalculator();
  private movement = new MovementAnalyzer();
  private coach = new PostureCoach();
  private lastAngles: JointAngles | null = null;
  private lastMovement: MovementData | null = null;

  process(rawLandmarks: PoseLandmark[]): PoseData {
    const smoothLandmarks = this.smoother.smooth(rawLandmarks);
    const angles = this.angleCalc.calculateAll(smoothLandmarks);
    const movement = this.movement.analyze(smoothLandmarks);
    const feedback = this.coach.evaluate(smoothLandmarks, angles, movement);

    this.lastAngles = angles;
    this.lastMovement = movement;

    const avgVisibility = rawLandmarks.reduce((s, l) => s + (l.visibility ?? 1), 0) / rawLandmarks.length;

    return {
      landmarks: rawLandmarks,
      smoothLandmarks,
      angles,
      movement,
      feedback,
      confidence: avgVisibility,
    };
  }

  getAngles(): JointAngles | null {
    return this.lastAngles;
  }

  getMovement(): MovementData | null {
    return this.lastMovement;
  }

  getFeedback(): string[] {
    return this.coach.getFeedback();
  }

  reset(): void {
    this.smoother.reset();
    this.movement.reset();
    this.coach.clear();
    this.lastAngles = null;
    this.lastMovement = null;
  }
}
