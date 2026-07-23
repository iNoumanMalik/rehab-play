import type { PoseLandmark, PoseData, JointAngles, MovementData } from '../../types';
import { JointSmoother, PREDICTION_HORIZON_SEC } from './JointSmoother';
import { LandmarkStabilizer } from './LandmarkStabilizer';
import { AngleSmoother } from './AngleSmoother';
import { AngleCalculator } from './AngleCalculator';
import { MovementAnalyzer } from './MovementAnalyzer';
import { PostureCoach } from './PostureCoach';

export class PoseEngine {
  private stabilizer = new LandmarkStabilizer();
  private smoother = new JointSmoother();
  private angleCalc = new AngleCalculator();
  private angleSmoother = new AngleSmoother();
  private movement = new MovementAnalyzer();
  private coach = new PostureCoach();
  private lastAngles: JointAngles | null = null;
  private lastMovement: MovementData | null = null;

  process(rawLandmarks: PoseLandmark[], timestampMs: number): PoseData {
    // Swap-correct / confidence-gate / speed-clamp BEFORE smoothing — feeding
    // the One-Euro filter a bad raw sample corrupts its velocity estimate and
    // is exactly what turns into vibration/snapping downstream.
    const stabilized = this.stabilizer.stabilize(rawLandmarks, timestampMs);
    const smoothedRaw = this.smoother.smooth(stabilized, timestampMs);
    // Bone-length constraint runs after smoothing, as a final geometric net
    // against compress/stretch artifacts a bad single joint can still cause.
    const smoothLandmarks = this.stabilizer.enforceBoneLengths(smoothedRaw, { learn: true, recordDebug: true });

    const predictedRaw = this.smoother.predict(smoothLandmarks, PREDICTION_HORIZON_SEC);
    // Don't let the speculative extrapolated pose corrupt the learned bone-length reference or overwrite the debug snapshot.
    const predictedLandmarks = this.stabilizer.enforceBoneLengths(predictedRaw, { learn: false, recordDebug: false });

    const rawAngles = this.angleCalc.calculateAll(smoothLandmarks);
    const angles = this.angleSmoother.smooth(rawAngles);
    const movement = this.movement.analyze(smoothLandmarks);
    const feedback = this.coach.evaluate(smoothLandmarks, angles, movement);

    this.lastAngles = angles;
    this.lastMovement = movement;

    const avgVisibility = rawLandmarks.reduce((s, l) => s + (l.visibility ?? 1), 0) / rawLandmarks.length;

    return {
      landmarks: rawLandmarks,
      smoothLandmarks,
      predictedLandmarks,
      angles,
      movement,
      feedback,
      confidence: avgVisibility,
      debug: this.stabilizer.getDebugState(),
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
    this.stabilizer.reset();
    this.smoother.reset();
    this.angleSmoother.reset();
    this.movement.reset();
    this.coach.clear();
    this.lastAngles = null;
    this.lastMovement = null;
  }
}
