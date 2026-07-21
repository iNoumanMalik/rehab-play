import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { voiceGuidance } from '../../core/services/VoiceGuidanceService';
import { StorageService } from '../../core/services/StorageService';
import type { Difficulty, DominantArm, TextSize, Theme } from '../../core/services/SettingsStore';

function Switch({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={`${label}. ${description}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 py-2.5 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-lg px-1 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span>
        <span className="block text-sm font-semibold text-[var(--color-text)]">{label}</span>
        <span className="block text-[11px] text-[var(--color-text-faint)]">{description}</span>
      </span>
      <span className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-hover)]'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="py-2.5">
      <span className="block text-sm font-semibold text-[var(--color-text)] mb-2">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              value === opt.value
                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface-strong)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, value, min = 0, max = 1, step = 0.05, onChange, disabled, endpoints }: {
  label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; disabled?: boolean;
  endpoints?: [string, string];
}) {
  const id = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="py-2.5 px-1">
      <label htmlFor={id} className="block text-sm font-semibold text-[var(--color-text)] mb-2">{label}</label>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-[var(--color-accent)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      />
      {endpoints && (
        <div className="flex justify-between text-[10px] text-[var(--color-text-faint)] mt-1 font-semibold">
          <span>{endpoints[0]}</span>
          <span>{endpoints[1]}</span>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-faint)] mt-5 mb-1 px-1 first:mt-0">{children}</h3>;
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: '🌙 Dark' },
  { value: 'light', label: '☀️ Light' },
];
const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'X-Large' },
];
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'gentle', label: 'Gentle' },
  { value: 'standard', label: 'Standard' },
  { value: 'challenging', label: 'Challenging' },
];
const DOMINANT_ARM_OPTIONS: { value: DominantArm; label: string }[] = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'both', label: 'Either' },
];

function ResetProgressConfirm({ onCancel, onConfirmed }: { onCancel: () => void; onConfirmed: () => void }) {
  return (
    <div role="alertdialog" aria-label="Confirm reset progress" className="text-center py-2">
      <div className="text-3xl mb-3" aria-hidden="true">⚠️</div>
      <h4 className="text-base font-extrabold text-[var(--color-text)] mb-2">Reset all progress?</h4>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-5 px-2">
        This permanently clears your XP, level, streak, session history, achievements, and saved calibration for every game.
        Your accessibility and audio settings are kept. This can't be undone.
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] font-bold text-sm border border-[var(--color-border)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Cancel
        </button>
        <button
          onClick={onConfirmed}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm border border-rose-500/50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          Yes, reset everything
        </button>
      </div>
    </div>
  );
}

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [s, set] = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setConfirmingReset(false);
  };

  return (
    <div className="relative">
      <button
        aria-label="Settings & Accessibility"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-lg transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/50"
      >
        ⚙️
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={closeMenu} aria-hidden="true" />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Settings & Accessibility"
            className="fixed sm:absolute right-0 left-0 sm:left-auto top-16 sm:top-auto sm:mt-3 mx-auto sm:mx-0 w-[calc(100%-2rem)] sm:w-80 max-h-[75vh] overflow-y-auto z-50 bg-[var(--color-bg-elevated)] backdrop-blur-xl border border-[var(--color-border)] rounded-2xl shadow-2xl p-4 outline-none"
          >
            <div className="flex items-center justify-between mb-1 px-1">
              <h2 className="text-sm font-black text-[var(--color-text)]">Settings & Accessibility</h2>
              <button
                onClick={closeMenu}
                aria-label="Close settings"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                ✕
              </button>
            </div>

            {confirmingReset ? (
              <ResetProgressConfirm
                onCancel={() => setConfirmingReset(false)}
                onConfirmed={() => {
                  StorageService.resetProgress();
                  window.location.reload();
                }}
              />
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                <div className="pb-1">
                  <SectionHeading>Display</SectionHeading>
                  <Segmented label="Theme" options={THEME_OPTIONS} value={s.theme} onChange={v => set({ theme: v })} />
                  <Segmented label="Text Size" options={TEXT_SIZE_OPTIONS} value={s.textSize} onChange={v => set({ textSize: v })} />
                  <Switch label="High Contrast" description="Solid borders, maximum contrast" checked={s.highContrast} onChange={v => set({ highContrast: v })} />
                  <Switch label="Colour-blind Mode" description="Distinct danger / safe colours" checked={s.colorblind} onChange={v => set({ colorblind: v })} />
                  <Switch label="Dyslexia-friendly Font" description="Switches body text to Atkinson Hyperlegible" checked={s.dyslexiaFont} onChange={v => set({ dyslexiaFont: v })} />
                  <Switch label="Reduced Motion" description="Calm backgrounds & effects" checked={s.reducedMotion} onChange={v => set({ reducedMotion: v })} />
                </div>

                <div className="py-1">
                  <SectionHeading>Audio</SectionHeading>
                  <Switch label="Music" description="Ambient background music" checked={s.musicOn} onChange={v => set({ musicOn: v })} />
                  <Slider label="Music Volume" value={s.musicVolume} onChange={v => set({ musicVolume: v })} disabled={!s.musicOn} />
                  <Switch label="Sound Effects" description="Catches, combos, level-ups" checked={s.sfxOn} onChange={v => set({ sfxOn: v })} />
                  <Slider label="SFX Volume" value={s.sfxVolume} onChange={v => set({ sfxVolume: v })} disabled={!s.sfxOn} />
                  <Switch
                    label="Voice Guidance"
                    description={voiceGuidance.available ? 'Speaks objectives & calibration prompts aloud' : 'Not supported in this browser'}
                    checked={s.voiceGuidanceOn}
                    disabled={!voiceGuidance.available}
                    onChange={v => set({ voiceGuidanceOn: v })}
                  />
                  <Slider label="Voice Volume" value={s.voiceVolume} onChange={v => set({ voiceVolume: v })} disabled={!s.voiceGuidanceOn} />
                  <Switch label="Captions" description="Show what Voice Guidance is saying" checked={s.captionsOn} disabled={!s.voiceGuidanceOn} onChange={v => set({ captionsOn: v })} />
                </div>

                <div className="py-1">
                  <SectionHeading>Gameplay</SectionHeading>
                  <Segmented label="Difficulty" options={DIFFICULTY_OPTIONS} value={s.difficulty} onChange={v => set({ difficulty: v })} />
                  <Segmented label="Dominant Arm" options={DOMINANT_ARM_OPTIONS} value={s.dominantArm} onChange={v => set({ dominantArm: v })} />
                  <Slider
                    label="Motion Sensitivity" value={s.motionSensitivity} min={0.7} max={1.3} step={0.05}
                    onChange={v => set({ motionSensitivity: v })}
                    endpoints={['More forgiving', 'More precise']}
                  />
                </div>

                <div className="py-1">
                  <SectionHeading>Language</SectionHeading>
                  <div className="py-2 px-1">
                    <select
                      aria-label="Language"
                      value={s.language}
                      onChange={() => set({ language: 'en' })}
                      className="w-full bg-[var(--color-surface-strong)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                    >
                      <option value="en">English</option>
                      <option value="es" disabled>Español (coming soon)</option>
                      <option value="ur" disabled>اردو (coming soon)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1">
                  <SectionHeading>Help</SectionHeading>
                  <button
                    onClick={() => { StorageService.remove('onboarding_complete'); window.location.reload(); }}
                    className="w-full text-left py-2.5 px-1 text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-accent)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-lg"
                  >
                    🔁 Replay Tutorial
                  </button>
                </div>

                <div className="pt-1">
                  <SectionHeading>Data</SectionHeading>
                  <button
                    onClick={() => setConfirmingReset(true)}
                    className="w-full text-left py-2.5 px-1 text-sm font-bold text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-lg"
                  >
                    🗑 Reset My Progress…
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
