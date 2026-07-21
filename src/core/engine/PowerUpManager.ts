export interface ActivePowerUp {
  kind: string;
  label: string;
  expiresAt: number;
}

/**
 * Timed hero-state effects (overdrive, slow-mo, score surge…). Multiple
 * power-ups can be active at once; each kind refreshes its own timer.
 */
export class PowerUpManager {
  private active = new Map<string, ActivePowerUp>();

  activate(kind: string, label: string, durationSec: number, now: number): void {
    this.active.set(kind, { kind, label, expiresAt: now + durationSec });
  }

  update(now: number): void {
    for (const [kind, p] of this.active) {
      if (now >= p.expiresAt) this.active.delete(kind);
    }
  }

  isActive(kind: string): boolean {
    return this.active.has(kind);
  }

  /** Seconds remaining for a kind, 0 if inactive. */
  remaining(kind: string, now: number): number {
    const p = this.active.get(kind);
    return p ? Math.max(0, p.expiresAt - now) : 0;
  }

  /** All currently active power-ups (for HUD display). */
  list(): ActivePowerUp[] {
    return [...this.active.values()];
  }

  clear(): void {
    this.active.clear();
  }
}
