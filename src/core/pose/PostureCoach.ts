import type { PoseLandmark, JointAngles, MovementData, CoachingLevel } from '../../types';
import { LANDMARK } from '../../types';

interface FeedbackRule {
  id: string;
  check: (lm: PoseLandmark[], angles: JointAngles, movement: MovementData) => string | null;
  level: CoachingLevel;
}

export class PostureCoach {
  private currentFeedback: string[] = [];
  private lastFeedbackTime = 0;
  private readonly cooldown = 1500;

  private rules: FeedbackRule[] = [
    {
      id: 'arm-height-right',
      level: 'needs-work',
      check: (lm) => {
        if (lm.length <= LANDMARK.RIGHT_WRIST) return null;
        const wrist = lm[LANDMARK.RIGHT_WRIST];
        const shoulder = lm[LANDMARK.RIGHT_SHOULDER];
        if (wrist.y > shoulder.y - 0.1) return 'Raise your right arm higher';
        return null;
      },
    },
    {
      id: 'arm-height-left',
      level: 'needs-work',
      check: (lm) => {
        if (lm.length <= LANDMARK.LEFT_WRIST) return null;
        const wrist = lm[LANDMARK.LEFT_WRIST];
        const shoulder = lm[LANDMARK.LEFT_SHOULDER];
        if (wrist.y > shoulder.y - 0.1) return 'Raise your left arm higher';
        return null;
      },
    },
    {
      id: 'elbow-straight-right',
      level: 'needs-work',
      check: (_lm, angles) => {
        if (angles.rightElbow < 120) return 'Straighten your right elbow';
        return null;
      },
    },
    {
      id: 'elbow-straight-left',
      level: 'needs-work',
      check: (_lm, angles) => {
        if (angles.leftElbow < 120) return 'Straighten your left elbow';
        return null;
      },
    },
    {
      id: 'good-posture',
      level: 'perfect',
      check: (_lm, angles) => {
        if (Math.abs(angles.trunkAngle - 180) < 15) return 'Excellent posture';
        return null;
      },
    },
    {
      id: 'reach-more-right',
      level: 'needs-work',
      check: (_lm, _angles, movement) => {
        if (movement.rightReachDistance < 0.3) return 'Reach further with your right arm';
        return null;
      },
    },
    {
      id: 'reach-more-left',
      level: 'needs-work',
      check: (_lm, _angles, movement) => {
        if (movement.leftReachDistance < 0.3) return 'Reach further with your left arm';
        return null;
      },
    },
    {
      id: 'controlled-move',
      level: 'good',
      check: (_lm, _angles, movement) => {
        if (movement.rightWristVelocity < 0.5 && movement.rightWristVelocity > 0.05) return 'Great control';
        return null;
      },
    },
    {
      id: 'full-range',
      level: 'perfect',
      check: (_lm, angles) => {
        if (angles.rightElbow > 160 && angles.rightShoulder > 120) return 'Full range of motion — excellent!';
        return null;
      },
    },
  ];

  evaluate(lm: PoseLandmark[], angles: JointAngles, movement: MovementData): string[] {
    const now = Date.now();
    if (now - this.lastFeedbackTime < this.cooldown) return this.currentFeedback;

    const newFeedback: string[] = [];
    for (const rule of this.rules) {
      const msg = rule.check(lm, angles, movement);
      if (msg) newFeedback.push(msg);
      if (newFeedback.length >= 2) break;
    }

    if (newFeedback.length > 0) {
      this.currentFeedback = newFeedback;
      this.lastFeedbackTime = now;
    }

    return this.currentFeedback;
  }

  getFeedback(): string[] {
    return this.currentFeedback;
  }

  clear(): void {
    this.currentFeedback = [];
    this.lastFeedbackTime = 0;
  }

  getLevel(msg: string): CoachingLevel | null {
    for (const rule of this.rules) {
      if (rule.check.toString().includes(msg)) return rule.level;
    }
    return null;
  }
}
