export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private _sfxEnabled = true;

  // Generative ambient music state
  private musicPlaying = false;
  private padGains: GainNode[] = [];
  private padOscs: OscillatorNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private padLfo: OscillatorNode | null = null;
  private chordTimer = 0;
  private twinkleTimer = 0;
  private chordIdx = 0;

  async init(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.bgmGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.6;
    this.bgmGain.gain.value = 0.22;
    this.sfxGain.gain.value = 0.7;
  }

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  // ---- Settings wiring -------------------------------------------------

  setSfxEnabled(on: boolean): void { this._sfxEnabled = on; }
  setMasterVolume(v: number): void { if (this.masterGain) this.masterGain.gain.value = v; }
  setMusicVolume(v: number): void { if (this.bgmGain) this.bgmGain.gain.value = v; }
  setSFXVolume(v: number): void { if (this.sfxGain) this.sfxGain.gain.value = v; }

  // ---- SFX (WebAudio synthesis, zero assets) ---------------------------

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 1, bus?: GainNode): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this._sfxEnabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(bus ?? this.sfxGain!);
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
  playHit(): void { this.playTone(200, 0.2, 'sawtooth', 0.3); }
  playLevelUp(): void {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 0.2, 'sine', 0.5), i * 150));
  }
  playGameOver(): void {
    this.playTone(400, 0.3, 'sine', 0.4);
    setTimeout(() => this.playTone(350, 0.3, 'sine', 0.4), 300);
    setTimeout(() => this.playTone(300, 0.5, 'sine', 0.3), 600);
  }
  playVictory(): void {
    [523, 587, 659, 784, 880, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 0.15, 'sine', 0.5), i * 120));
  }

  // ---- Generative ambient music ---------------------------------------

  private static CHORDS = [
    [220.0, 277.2, 329.6], // A major-ish
    [196.0, 246.9, 329.6], // G
    [174.6, 220.0, 261.6], // F
    [261.6, 329.6, 392.0], // C
  ];
  private static TWINKLES = [523.3, 587.3, 659.3, 784.0, 880.0, 987.8];

  startMusic(): void {
    const ctx = this.ensureCtx();
    if (!ctx || this.musicPlaying || !this.bgmGain) return;
    this.musicPlaying = true;

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 650;
    this.padFilter.Q.value = 3;
    this.padFilter.connect(this.bgmGain);

    // Slow filter sweep for movement.
    this.padLfo = ctx.createOscillator();
    this.padLfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    this.padLfo.connect(lfoGain);
    lfoGain.connect(this.padFilter.frequency);
    this.padLfo.start();

    this.setChord(0);
    this.chordTimer = window.setInterval(() => this.setChord(++this.chordIdx), 8500);
    this.twinkleTimer = window.setInterval(() => this.twinkle(), 2600);
  }

  private setChord(i: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.padFilter) return;
    const chord = AudioManager.CHORDS[i % AudioManager.CHORDS.length];

    // Fade out the previous chord.
    const now = ctx.currentTime;
    for (const g of this.padGains) g.gain.linearRampToValueAtTime(0, now + 1.6);
    const oldOscs = this.padOscs;
    setTimeout(() => oldOscs.forEach(o => { try { o.stop(); } catch { /* already stopped */ } }), 1800);

    this.padGains = [];
    this.padOscs = [];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (idx - 1) * 4;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 1.6);
      osc.connect(gain);
      gain.connect(this.padFilter!);
      osc.start();
      this.padOscs.push(osc);
      this.padGains.push(gain);
    });
  }

  private twinkle(): void {
    if (!this.musicPlaying || !this.bgmGain) return;
    if (Math.random() < 0.35) return; // leave space
    const f = AudioManager.TWINKLES[Math.floor(Math.random() * AudioManager.TWINKLES.length)];
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start();
    osc.stop(ctx.currentTime + 1.7);
  }

  stopMusic(): void {
    if (!this.musicPlaying) return;
    this.musicPlaying = false;
    window.clearInterval(this.chordTimer);
    window.clearInterval(this.twinkleTimer);
    const now = this.ctx?.currentTime ?? 0;
    for (const g of this.padGains) { try { g.gain.linearRampToValueAtTime(0, now + 0.6); } catch { /* noop */ } }
    const oscs = this.padOscs;
    const lfo = this.padLfo;
    setTimeout(() => {
      oscs.forEach(o => { try { o.stop(); } catch { /* noop */ } });
      try { lfo?.stop(); } catch { /* noop */ }
    }, 700);
    this.padGains = [];
    this.padOscs = [];
    this.padLfo = null;
    this.padFilter = null;
  }

  get isMusicPlaying(): boolean { return this.musicPlaying; }
}

export const audioManager = new AudioManager();
