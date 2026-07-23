import { motion } from 'framer-motion';
import { Panel } from '../ui/primitives/Panel';
import { Badge } from '../ui/primitives/Badge';
import { useSettings } from '../../hooks/useSettings';
import { TEXT_SIZE_OPTIONS } from '../ui/settingsOptions';

/** Each card is a real, working control (not a marketing screenshot) — clicking
 * it actually flips the setting app-wide via the shared SettingsStore, so the
 * "try it now" promise is honest and gives immediate feedback (Nielsen #1). */
export function AccessibilityShowcase() {
  const [settings, setSettings] = useSettings();

  return (
    <section id="accessibility" className="relative py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-text">Accessibility</span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text font-display tracking-tight mt-2">
          Designed for every body, every ability
        </h2>
        <p className="text-muted text-sm sm:text-base mt-3">
          These aren't screenshots — every card below is a live control. Try one.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}>
          <Panel className="p-5 sm:p-6 h-full">
            <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl mb-4">🔤</div>
            <h3 className="font-bold text-text font-display mb-2">Adjustable Text Size</h3>
            <p className="text-muted text-sm leading-relaxed mb-4">Scale every label and heading app-wide, from compact to extra large.</p>
            <div className="flex flex-wrap gap-1.5">
              {TEXT_SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSettings({ textSize: opt.value })}
                  aria-pressed={settings.textSize === opt.value}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                    settings.textSize === opt.value ? 'bg-accent border-accent text-white' : 'bg-surface-strong border-border text-muted hover:bg-surface-hover'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: 0.05 }}>
          <Panel className="p-5 sm:p-6 h-full">
            <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl mb-4">🌗</div>
            <h3 className="font-bold text-text font-display mb-2">Light / Dark Mode</h3>
            <p className="text-muted text-sm leading-relaxed mb-4">A genuine warm-dark theme, not just an inverted palette.</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSettings({ theme: 'light' })}
                aria-pressed={settings.theme === 'light'}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                  settings.theme === 'light' ? 'bg-accent border-accent text-white' : 'bg-surface-strong border-border text-muted hover:bg-surface-hover'
                }`}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => setSettings({ theme: 'dark' })}
                aria-pressed={settings.theme === 'dark'}
                className={`flex-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                  settings.theme === 'dark' ? 'bg-accent border-accent text-white' : 'bg-surface-strong border-border text-muted hover:bg-surface-hover'
                }`}
              >
                🌙 Dark
              </button>
            </div>
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Panel className="p-5 sm:p-6 h-full">
            <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl mb-4">🌐</div>
            <h3 className="font-bold text-text font-display mb-2">Urdu Language Support</h3>
            <p className="text-muted text-sm leading-relaxed mb-4">Full Urdu localization is on our roadmap for a future release.</p>
            <Badge tone="neutral">🚧 Coming soon</Badge>
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Panel className="p-5 sm:p-6 h-full">
            <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl mb-4">🔲</div>
            <h3 className="font-bold text-text font-display mb-2">High Contrast Mode</h3>
            <p className="text-muted text-sm leading-relaxed mb-4">Solid borders and maximum text contrast, composes with either theme.</p>
            <button
              onClick={() => setSettings({ highContrast: !settings.highContrast })}
              role="switch"
              aria-checked={settings.highContrast}
              className={`w-full px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                settings.highContrast ? 'bg-accent border-accent text-white' : 'bg-surface-strong border-border text-muted hover:bg-surface-hover'
              }`}
            >
              {settings.highContrast ? 'On — tap to disable' : 'Off — tap to enable'}
            </button>
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Panel className="p-5 sm:p-6 h-full">
            <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl mb-4">🎞️</div>
            <h3 className="font-bold text-text font-display mb-2">Reduced Motion</h3>
            <p className="text-muted text-sm leading-relaxed mb-4">Calms every animation on this page and in-game, instantly.</p>
            <button
              onClick={() => setSettings({ reducedMotion: !settings.reducedMotion })}
              role="switch"
              aria-checked={settings.reducedMotion}
              className={`w-full px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                settings.reducedMotion ? 'bg-accent border-accent text-white' : 'bg-surface-strong border-border text-muted hover:bg-surface-hover'
              }`}
            >
              {settings.reducedMotion ? 'On — tap to disable' : 'Off — tap to enable'}
            </button>
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: 0.25 }}>
          <Panel className="p-5 sm:p-6 h-full">
            <div aria-hidden="true" className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl mb-4">🎨</div>
            <h3 className="font-bold text-text font-display mb-2">Color-Blind Mode</h3>
            <p className="text-muted text-sm leading-relaxed mb-4">Every in-game danger/safe cue swaps to an orange/blue-safe ramp.</p>
            <button
              onClick={() => setSettings({ colorblind: !settings.colorblind })}
              role="switch"
              aria-checked={settings.colorblind}
              className={`w-full px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                settings.colorblind ? 'bg-accent border-accent text-white' : 'bg-surface-strong border-border text-muted hover:bg-surface-hover'
              }`}
            >
              {settings.colorblind ? 'On — tap to disable' : 'Off — tap to enable'}
            </button>
          </Panel>
        </motion.div>
      </div>
    </section>
  );
}
