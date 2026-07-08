export class GameEngine {
  private animFrameId = 0;
  private lastTime = 0;
  private _running = false;
  private _paused = false;
  private updateFn: ((dt: number) => void) | null = null;
  private renderFn: ((ctx: CanvasRenderingContext2D) => void) | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeHandler: (() => void) | null = null;

  get running(): boolean {
    return this._running;
  }

  get paused(): boolean {
    return this._paused;
  }

  start(
    canvas: HTMLCanvasElement,
    onUpdate: (dt: number) => void,
    onRender: (ctx: CanvasRenderingContext2D) => void,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.ctx = ctx;
    this.updateFn = onUpdate;
    this.renderFn = onRender;
    this._running = true;
    this._paused = false;
    this.lastTime = performance.now();

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    this.resizeHandler = resize;

    this.loop(performance.now());
  }

  stop(): void {
    this._running = false;
    this._paused = false;
    cancelAnimationFrame(this.animFrameId);
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  pause(): void {
    if (this._paused) return;
    this._paused = true;
    // Stop the rAF chain entirely rather than let it keep ticking idle — see
    // the note on `loop` for why resuming used to double the update rate.
    cancelAnimationFrame(this.animFrameId);
  }

  resume(): void {
    if (!this._paused) return;
    this._paused = false;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  resize(): void {
    if (this.resizeHandler) this.resizeHandler();
  }

  // While paused, `pause()` cancels the scheduled frame and nothing re-requests
  // one, so this never fires until `resume()` kicks off a single fresh chain.
  // (An earlier version rescheduled unconditionally here and had `resume()`
  // invoke `loop` directly too, which briefly ran two concurrent rAF chains —
  // silently doubling update() calls per frame after every pause/resume.)
  private loop = (now: number): void => {
    if (!this._running || this._paused) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.updateFn?.(dt);
    if (this.ctx && this.renderFn) {
      this.renderFn(this.ctx);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
