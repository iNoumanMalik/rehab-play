type Step = 'ready' | 'neutral' | 'transition' | 'max' | 'complete';

const DURATIONS: Record<Step, number> = {
  ready: 1.2,
  neutral: 2.2,
  transition: 1.4,
  max: 3.0,
  complete: 0,
};

/**
 * A short, frame-driven guided calibration: rest to capture the neutral effort,
 * then reach to full range to capture the max. Time is advanced by dt (no wall
 * clock) so it stays deterministic and resume-safe.
 */
export class CalibrationSession {
  private step: Step = 'ready';
  private t = 0;
  private neutralSum = 0;
  private neutralCount = 0;
  private maxEffort = -Infinity;

  neutral = 0;
  max = 1;

  private neutralPrompt: string;
  private maxPrompt: string;

  constructor(neutralPrompt: string, maxPrompt: string) {
    this.neutralPrompt = neutralPrompt;
    this.maxPrompt = maxPrompt;
  }

  get currentStep(): Step { return this.step; }
  get done(): boolean { return this.step === 'complete'; }

  /** Progress within the current capture step, 0..1. */
  get stepProgress(): number {
    const total = DURATIONS[this.step];
    return total > 0 ? Math.min(1, this.t / total) : 1;
  }

  get prompt(): string {
    switch (this.step) {
      case 'ready': return 'Get your whole upper body in frame…';
      case 'neutral': return this.neutralPrompt;
      case 'transition': return this.maxPrompt;
      case 'max': return `${this.maxPrompt} — hold it!`;
      case 'complete': return 'Calibrated!';
    }
  }

  get capturing(): boolean {
    return this.step === 'neutral' || this.step === 'max';
  }

  update(effort: number, dt: number): void {
    if (this.step === 'complete') return;
    this.t += dt;

    if (this.step === 'neutral') {
      this.neutralSum += effort;
      this.neutralCount++;
    } else if (this.step === 'max') {
      this.maxEffort = Math.max(this.maxEffort, effort);
    }

    if (this.t >= DURATIONS[this.step]) {
      this.advance();
    }
  }

  private advance(): void {
    this.t = 0;
    switch (this.step) {
      case 'ready': this.step = 'neutral'; break;
      case 'neutral':
        this.neutral = this.neutralCount ? this.neutralSum / this.neutralCount : 0;
        this.step = 'transition';
        break;
      case 'transition': this.step = 'max'; break;
      case 'max':
        this.max = this.maxEffort > this.neutral ? this.maxEffort : this.neutral + 0.5;
        this.step = 'complete';
        break;
      case 'complete': break;
    }
  }
}
