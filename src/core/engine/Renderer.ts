export class Renderer {
  static clear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);
  }

  static roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  static drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1): void {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  static drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  static drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: {
    color?: string;
    size?: number;
    weight?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    alpha?: number;
  } = {}): void {
    const { color = '#fff', size = 20, weight = 'bold', align = 'left', baseline = 'top', alpha = 1 } = opts;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  }

  static drawProgressBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number, color: string, bgColor = 'rgba(255,255,255,0.1)'): void {
    Renderer.roundedRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = bgColor;
    ctx.fill();
    Renderer.roundedRect(ctx, x, y, w * Math.max(0, Math.min(1, progress)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /** Soft themed vignette to frame the scene without hiding the camera. */
  static drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, strength = 0.5): void {
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, color + '00');
    grad.addColorStop(1, color + Math.round(strength * 255).toString(16).padStart(2, '0'));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * A soft full-width backdrop band behind in-canvas HUD text (score, level,
   * etc), fading out at both edges so it reads as a legible strip rather than
   * a hard bar cutting across the camera feed underneath.
   */
  static drawHudBand(ctx: CanvasRenderingContext2D, w: number, y: number, h: number, alpha = 0.32): void {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, `rgba(0,0,0,0)`);
    grad.addColorStop(0.15, `rgba(0,0,0,${alpha})`);
    grad.addColorStop(0.85, `rgba(0,0,0,${alpha})`);
    grad.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, w, h);
  }

  /** A small pill-backed label (e.g. "Level 3") — for a single lone piece of
   * canvas HUD text, where a full-width drawHudBand would be a wide near-empty
   * bar for no reason. Sized to fit the text, not the canvas width. */
  static drawTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: {
    size?: number; color?: string; align?: CanvasTextAlign; bg?: string;
  } = {}): void {
    const { size = 13, color = '#88ccff', align = 'right', bg = 'rgba(0,0,0,0.4)' } = opts;
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    const padX = 10, padY = 5;
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + padX * 2;
    const boxH = size + padY * 2;
    const boxX = align === 'right' ? x - boxW : align === 'center' ? x - boxW / 2 : x;
    ctx.fillStyle = bg;
    Renderer.roundedRect(ctx, boxX, y - padY, boxW, boxH, boxH / 2);
    ctx.fill();
    Renderer.drawText(ctx, text, x, y, { size, color, align });
  }

  static drawHandCursor(ctx: CanvasRenderingContext2D, x: number, y: number, r = 35): void {
    Renderer.drawGlow(ctx, x, y, r * 1.5, '#ffffff');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
