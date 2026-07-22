import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { StorageService } from '../../core/services/StorageService';
import { Button } from '../ui/primitives/Button';
import { Segmented, Switch } from '../ui/SettingsMenu';
import { THEME_OPTIONS, TEXT_SIZE_OPTIONS } from '../ui/settingsOptions';

interface OnboardingProps {
  onDone: () => void;
}

const STEP_COUNT = 4;

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[var(--color-accent)]' : 'w-1.5 bg-[var(--color-border-strong)]'}`}
        />
      ))}
    </div>
  );
}

/**
 * A short, skippable, resumable first-run flow. Every step can be skipped
 * (User Control & Freedom); accessibility preferences are set up front so the
 * rest of onboarding itself already reflects the player's needs (Flexibility
 * & Personalization applied to onboarding, not just the settings menu).
 */
export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [s, set] = useSettings();

  const finish = () => {
    StorageService.set('onboarding_complete', true);
    onDone();
  };

  const next = () => (step < STEP_COUNT - 1 ? setStep(step + 1) : finish());
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to RehabPlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6"
    >
      <div className="w-full max-w-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-[popIn_0.35s_ease-out]">
        <div className="flex justify-end mb-1">
          <button
            onClick={finish}
            className="text-xs font-bold text-[var(--color-text-faint)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded px-2 py-1"
          >
            Skip
          </button>
        </div>

        {step === 0 && (
          <div className="py-4">
            <div className="text-5xl mb-4">⚡</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] mb-3">Welcome to RehabPlay</h2>
            <p className="text-[var(--color-text-muted)] text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
              A rehab session that plays like a game. Your webcam turns real arm and body movement into on-screen action — no controller needed.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="py-4 text-left">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)] mb-1 text-center">Make it comfortable for you</h2>
            <p className="text-[var(--color-text-muted)] text-sm mb-6 text-center">You can change any of this later in Settings.</p>

            <div className="space-y-1 max-w-sm mx-auto">
              <Segmented label="Theme" options={THEME_OPTIONS} value={s.theme} onChange={v => set({ theme: v })} />
              <Segmented label="Text Size" options={TEXT_SIZE_OPTIONS} value={s.textSize} onChange={v => set({ textSize: v })} />
              <Switch
                label="Reduced Motion"
                description="Calm backgrounds and effects"
                checked={s.reducedMotion}
                onChange={v => set({ reducedMotion: v })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="py-4">
            <div className="text-5xl mb-4">📹</div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)] mb-3">We'll need your camera</h2>
            <p className="text-[var(--color-text-muted)] text-sm leading-relaxed max-w-sm mx-auto mb-4">
              RehabPlay tracks your movement locally in your browser to power the games — your video is never uploaded or recorded.
              Stand back so your head, shoulders, and hands are all visible, in a reasonably well-lit room.
            </p>
            <p className="text-[var(--color-text-faint)] text-xs">We'll let you know if you're too close, too far, or the room is too dark.</p>
          </div>
        )}

        {step === 3 && (
          <div className="py-4">
            <div className="text-5xl mb-4">🦋</div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-text)] mb-3">Ready for your first mission</h2>
            <p className="text-[var(--color-text-muted)] text-sm leading-relaxed max-w-sm mx-auto mb-2">
              We recommend starting with <strong className="text-[var(--color-text)]">Butterfly Rescue</strong> — a gentle warm-up that measures your comfortable range of motion before anything is scored.
            </p>
            <p className="text-[var(--color-text-faint)] text-xs">You can pick any game from the dashboard, and replay this tutorial anytime from Settings.</p>
          </div>
        )}

        <StepDots step={step} />

        <div className="flex items-center justify-center gap-3 mt-6">
          {step > 0 && (
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
          )}
          <Button variant="primary" onClick={next}>
            {step < STEP_COUNT - 1 ? 'Next' : "Let's Go"}
          </Button>
        </div>
      </div>
    </div>
  );
}
