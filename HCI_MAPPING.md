# HCI Principle Mapping

This document cross-references RehabPlay's implemented features to the specific HCI principles they satisfy — Nielsen's 10 Usability Heuristics, Shneiderman's Eight Golden Rules, and WCAG 2.1 Success Criteria. It is built incrementally, one entry per shipped feature, so it reflects what is actually in the codebase rather than what was planned. Use it as the evidence base for the project report/viva; file paths are given so each claim can be verified directly against the code.

**Legend**
- **Nielsen #** — Nielsen's 10 Usability Heuristics (1–10; see key below)
- **Shneiderman** — Shneiderman's Eight Golden Rules of Interface Design (1–8; see key below)
- **WCAG** — WCAG 2.1 Success Criterion

<details>
<summary>Key: Nielsen's 10 Heuristics</summary>

1. Visibility of system status
2. Match between system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation
</details>

<details>
<summary>Key: Shneiderman's Eight Golden Rules</summary>

1. Strive for consistency
2. Enable frequent users to use shortcuts
3. Offer informative feedback
4. Design dialogs to yield closure
5. Offer simple error handling
6. Permit easy reversal of actions
7. Support internal locus of control
8. Reduce short-term memory load
</details>

---

## Phase A — Accessibility & Personalization Settings Infrastructure

| Feature | Implemented in | Principle(s) satisfied | Notes |
|---|---|---|---|
| Adjustable text size (Small/Medium/Large/X-Large), scales all Tailwind rem-based type app-wide via root font-size | `src/index.css` (`:root[data-text-size]`, `html { font-size: calc(16px * var(--font-scale)) }`), `src/components/ui/SettingsMenu.tsx` | WCAG 1.4.4 (Resize Text); Nielsen #7 Flexibility & efficiency | One CSS variable drives every screen — new screens inherit correct scaling for free. |
| Light Mode / Dark Mode, real independently-designed palettes (not a naive invert) | `src/index.css` (`:root`, `:root[data-theme='light']`), stamped pre-paint in `src/main.tsx`, kept live in `src/App.tsx` | WCAG 1.4.3 (Contrast Minimum) groundwork; Nielsen #7 Flexibility | Full app-wide application of the palette is Phase B; Phase A wires the mechanism and applies it to the app shell + the settings panel itself. |
| High Contrast Mode, composes on top of either theme (solid borders, no translucency, max text contrast) | `src/index.css` (`:root[data-contrast='high']`) | WCAG 1.4.3 / 1.4.11 (Non-text Contrast); Nielsen #7 | Deliberately a *composable* layer, not a third theme, so it works with both Dark and Light. |
| Colour-blind Mode (existing, carried forward) | `src/core/engine/palette.ts`, `src/components/ui/SettingsMenu.tsx` | WCAG 1.4.1 (Use of Color); Nielsen #7 | Danger/safe colours swap to orange/blue, the most broadly distinguishable substitution across common deficiency types. |
| Dyslexia-friendly font (Atkinson Hyperlegible) | `src/index.css` (`:root[data-dyslexia]`) | WCAG 1.4.8 (Visual Presentation, spirit of); Nielsen #7 | Applied via a single font-family variable, so it doesn't require per-component changes. |
| Reduced Motion (existing, carried forward) | `src/core/services/SettingsStore.ts`, `src/index.css` `.reduce-motion` | WCAG 2.3.3 (Animation from Interactions); Nielsen #7 | Independent of the OS-level `prefers-reduced-motion` media query — an explicit in-app override for users whose OS default doesn't match their in-the-moment need. |
| Independent Music / SFX / Voice Guidance volume controls | `src/core/services/SettingsStore.ts`, `src/core/services/AudioManager.ts` (`setMusicVolume`/`setSFXVolume`), `src/components/ui/SettingsMenu.tsx` | WCAG 1.4.2 (Audio Control); Nielsen #7 | Each channel is independently mutable and audibly on/off — not one master fader standing in for three different requirements. |
| Voice Guidance — objectives, calibration prompts, and session outcomes spoken aloud via the Web Speech API | `src/core/services/VoiceGuidanceService.ts`, wired from `src/components/game/GameRunner.tsx` and `src/components/game/VictoryScreen.tsx` | WCAG 1.3.3 (Sensory Characteristics, non-visual channel); Nielsen #1 Visibility of system status; Nielsen #2 Match with real world (spoken coaching, not a beep) | Feature-detected — silently degrades to text-only guidance (already always shown) where `speechSynthesis` is unavailable, so nothing breaks. |
| Captions for Voice Guidance | `src/components/ui/CaptionBar.tsx` | WCAG 1.2.2-style (captions for audio content); Nielsen #1 | Only renders while Voice Guidance is actually speaking — never shows stale or hypothetical captions. |
| Difficulty selection (Gentle / Standard / Challenging) and Motion Sensitivity, both wired into real rep-detection thresholds, not inert toggles | `src/core/exercise/ExerciseEngine.ts` (`tuneDefinition`) | Nielsen #7 Flexibility & efficiency; rehab-specific: personalized ROM gating | Builds a tuned copy of the shared `ExerciseDefinition` per session instead of mutating the singleton, so different players/sessions never leak tuning into each other. |
| Dominant Arm personalization, biases ambiguous aim resolution toward the player's preferred arm | `src/core/movement/GestureEngine.ts` | Nielsen #7 Flexibility & efficiency | Intentionally only a *tie-break* (±0.04 bias) — a clearly-more-extended non-dominant arm still wins, so the control never fights the player's actual movement. |
| Language selector with an honest roadmap (only English enabled; others visibly listed as "coming soon" rather than hidden or silently non-functional) | `src/components/ui/SettingsMenu.tsx` | Nielsen #1 Visibility of system status (no dishonest UI); Nielsen #7 | A disabled-with-explanation option is preferred over omitting the setting or letting it silently fail. |
| "Reset My Progress" — the app's first real destructive action, gated behind a custom accessible confirmation dialog (not `window.confirm`) that explains exactly what is and isn't cleared | `src/core/services/StorageService.ts` (`resetProgress`), `src/components/ui/SettingsMenu.tsx` (`ResetProgressConfirm`) | Nielsen #5 Error prevention; Nielsen #3 User control & freedom; Shneiderman #5 Simple error handling, #6 Easy reversal (of the *decision*, via Cancel) | Explicitly scoped to progress/achievements/calibration only — accessibility and audio preferences are untouched, because "reset my progress" and "reset my preferences" are different user intents that shouldn't be conflated. |
| Settings & Accessibility panel restructured into a labelled, sectioned dialog (Display / Audio / Gameplay / Language / Data) with `role="dialog"`, `aria-modal`, Escape-to-close, and focus moved to the panel on open | `src/components/ui/SettingsMenu.tsx` | WCAG 2.4.3 (Focus Order), 4.1.2 (Name, Role, Value); Nielsen #4 Consistency, #6 Recognition rather than recall; Shneiderman #1 Consistency | All settings are reachable from one predictable place, at any time, from any screen (Header is always mounted) — not buried per-screen. |

**Known scope boundary (by design, not oversight):** the new tokens above are applied to the app shell and the Settings panel itself in Phase A; the remaining ~20 screens are refactored onto the same tokens in Phase B. Until then, most of the app still renders in its original dark palette regardless of the Theme toggle — this is the planned incremental rollout, not a bug.
