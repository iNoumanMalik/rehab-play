import { settingsStore } from './SettingsStore';

export interface SpokenLine {
  text: string;
  at: number;
}

/**
 * Thin wrapper around the browser's built-in speech synthesis so objectives,
 * calibration prompts, and session outcomes can optionally be spoken aloud —
 * a real accessibility channel (not just a volume slider with nothing behind
 * it) for players who can't rely on reading the screen while moving. Feature-
 * detected: silently a no-op where speechSynthesis isn't available.
 */
class VoiceGuidanceService {
  private listeners = new Set<() => void>();
  private last: SpokenLine | null = null;
  private readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  get available(): boolean {
    return this.supported;
  }

  get lastSpoken(): SpokenLine | null {
    return this.last;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  /** Speak a line if voice guidance is enabled. `interrupt` cuts off anything currently speaking (used for priority lines like a rep result). */
  speak(text: string, opts: { interrupt?: boolean } = {}): void {
    if (!text) return;
    const s = settingsStore.get();
    if (!s.voiceGuidanceOn) return; // captions track intent-to-speak, so gate on the setting first

    this.last = { text, at: Date.now() };
    this.listeners.forEach(l => l());
    if (!this.supported) return; // no TTS engine — captions above still carry the guidance as text

    if (opts.interrupt) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.volume = Math.max(0, Math.min(1, s.voiceVolume));
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  }

  stop(): void {
    if (this.supported) window.speechSynthesis.cancel();
  }
}

export const voiceGuidance = new VoiceGuidanceService();
