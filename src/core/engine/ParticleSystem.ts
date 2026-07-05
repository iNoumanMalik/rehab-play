interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; maxSize: number;
  color: string;
  alpha: number;
  gravity: number;
  friction: number;
  shrink: boolean;
}

interface ParticleConfig {
  count?: number;
  speed?: number;
  size?: number;
  color?: string;
  colors?: string[];
  lifetime?: number;
  gravity?: number;
  spread?: number;
  shrink?: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  emit(x: number, y: number, config: ParticleConfig = {}): void {
    const {
      count = 10,
      speed = 100,
      size = 4,
      color = '#ffffff',
      colors,
      lifetime = 0.8,
      gravity = 0,
      spread = Math.PI * 2,
      shrink = true,
    } = config;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * spread - spread / 2 - Math.PI / 2;
      const spd = speed * (0.5 + Math.random());
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: lifetime,
        maxLife: lifetime,
        size: size * (0.5 + Math.random()),
        maxSize: size,
        color: colors ? colors[Math.floor(Math.random() * colors.length)] : color,
        alpha: 1,
        gravity,
        friction: 0.98,
        shrink,
      });
    }
  }

  emitBurst(x: number, y: number, config: ParticleConfig = {}): void {
    this.emit(x, y, { ...config, spread: Math.PI * 2, count: config.count || 20 });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.shrink) {
        p.size = p.maxSize * p.alpha;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles.length = 0;
  }
}
