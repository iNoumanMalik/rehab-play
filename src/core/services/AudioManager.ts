export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.bgmGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.5;
    this.bgmGain.gain.value = 0.3;
    this.sfxGain.gain.value = 0.7;
  }

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 1): void {
    const ctx = this.ensureCtx();
    if (!ctx || this._muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playSuccess(): void {
    this.playTone(523, 0.15, 'sine', 0.5);
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.5), 100);
    setTimeout(() => this.playTone(784, 0.3, 'sine', 0.5), 200);
  }

  playCombo(): void {
    this.playTone(880, 0.1, 'square', 0.3);
    setTimeout(() => this.playTone(1100, 0.15, 'square', 0.3), 80);
  }

  playCollect(): void {
    this.playTone(600, 0.08, 'sine', 0.4);
    setTimeout(() => this.playTone(800, 0.08, 'sine', 0.4), 50);
  }

  playHit(): void {
    this.playTone(200, 0.2, 'sawtooth', 0.3);
  }

  playLevelUp(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'sine', 0.5), i * 150);
    });
  }

  playGameOver(): void {
    this.playTone(400, 0.3, 'sine', 0.4);
    setTimeout(() => this.playTone(350, 0.3, 'sine', 0.4), 300);
    setTimeout(() => this.playTone(300, 0.5, 'sine', 0.3), 600);
  }

  playVictory(): void {
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.15, 'sine', 0.5), i * 120);
    });
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : 0.5;
    }
    return this._muted;
  }

  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setMusicVolume(v: number): void {
    if (this.bgmGain) this.bgmGain.gain.value = v;
  }

  setSFXVolume(v: number): void {
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }
}

export const audioManager = new AudioManager();
