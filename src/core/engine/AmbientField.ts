import { settingsStore } from '../services/SettingsStore';

export type AmbientKind = 'petal' | 'ember' | 'mote';

interface AmbientConfig {
  kind: AmbientKind;
  colors: string[];
  count: number;
  maxAlpha?: number;
}

interface P {
  x: number; y: number; vx: number; vy: number;
  size: number; rot: number; vr: number; phase: number; color: string;
}

/**
 * Semi-transparent, themed atmosphere drawn over the camera but under the game
 * entities — drifting petals / rising embers / floating energy motes. Kept low
 * alpha so the player's mirror image still shows through the AR overlay.
 * Honours the reduced-motion setting (fewer particles, no drift).
 */
export class AmbientField {
  private ps: P[] = [];
  private kind: AmbientKind;
  private colors: string[];
  private count: number;
  private maxAlpha: number;
  private t = 0;

  constructor(cfg: AmbientConfig) {
    this.kind = cfg.kind;
    this.colors = cfg.colors;
    this.count = cfg.count;
    this.maxAlpha = cfg.maxAlpha ?? 0.35;
  }

  private target(): number {
    return settingsStore.get().reducedMotion ? Math.ceil(this.count / 3) : this.count;
  }

  private seed(w: number, h: number): P {
    const speed = this.kind === 'ember' ? 18 + Math.random() * 26 : 8 + Math.random() * 16;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 14,
      vy: this.kind === 'ember' ? -speed : speed * 0.5,
      size: this.kind === 'mote' ? 2 + Math.random() * 3 : 6 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 1.5,
      phase: Math.random() * Math.PI * 2,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
    };
  }

  update(dt: number, w: number, h: number): void {
    this.t += dt;
    const target = this.target();
    while (this.ps.length < target) this.ps.push(this.seed(w, h));
    if (this.ps.length > target) this.ps.length = target;

    const reduced = settingsStore.get().reducedMotion;
    const motion = reduced ? 0.15 : 1;

    for (const p of this.ps) {
      p.x += (p.vx + Math.sin(this.t + p.phase) * 6) * dt * motion;
      p.y += p.vy * dt * motion;
      p.rot += p.vr * dt * motion;
      if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.ps) {
      const pulse = this.kind === 'mote' ? 0.5 + 0.5 * Math.sin(this.t * 2 + p.phase) : 1;
      ctx.globalAlpha = this.maxAlpha * pulse;
      if (this.kind === 'petal') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = this.kind === 'mote' ? 10 : 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
  }
}
