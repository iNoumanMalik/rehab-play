const COMBO_THRESHOLDS = [
  { count: 3, multiplier: 2 },
  { count: 5, multiplier: 3 },
  { count: 8, multiplier: 5 },
  { count: 12, multiplier: 8 },
];

export class ComboSystem {
  combo = 0;
  maxCombo = 0;
  private timer = 0;
  private readonly window = 2;

  registerHit(): number {
    this.combo++;
    this.timer = this.window;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    return this.getMultiplier();
  }

  registerMiss(): void {
    this.combo = 0;
    this.timer = 0;
  }

  getMultiplier(): number {
    let mult = 1;
    for (const t of COMBO_THRESHOLDS) {
      if (this.combo >= t.count) mult = t.multiplier;
    }
    return mult;
  }

  update(dt: number): void {
    if (this.combo > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.combo = 0;
    }
  }

  reset(): void {
    this.combo = 0;
    this.maxCombo = 0;
    this.timer = 0;
  }
}
