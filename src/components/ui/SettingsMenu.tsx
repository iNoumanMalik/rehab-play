import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

function Switch({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 py-2.5 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 rounded-lg px-1"
    >
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="block text-[11px] text-white/50">{description}</span>
      </span>
      <span className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-violet-500' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [s, set] = useSettings();

  return (
    <div className="relative">
      <button
        aria-label="Settings"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.12] text-lg transition-all duration-300 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50"
      >
        ⚙️
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            aria-label="Settings"
            className="absolute right-0 mt-3 w-72 z-40 bg-[#0d1226]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-2xl p-4"
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/50 mb-2 px-1">Settings</h3>
            <div className="divide-y divide-white/[0.06]">
              <Switch label="Music" description="Ambient background music" checked={s.musicOn} onChange={v => set({ musicOn: v })} />
              <Switch label="Sound Effects" description="Catches, combos, level-ups" checked={s.sfxOn} onChange={v => set({ sfxOn: v })} />
              <div className="py-3 px-1">
                <label htmlFor="volume" className="block text-sm font-semibold text-white mb-2">Volume</label>
                <input
                  id="volume" type="range" min={0} max={1} step={0.05} value={s.volume}
                  onChange={e => set({ volume: Number(e.target.value) })}
                  aria-label="Master volume"
                  className="w-full accent-violet-500 cursor-pointer"
                />
              </div>
              <Switch label="Reduced Motion" description="Calm backgrounds & effects" checked={s.reducedMotion} onChange={v => set({ reducedMotion: v })} />
              <Switch label="Colour-blind Mode" description="Distinct danger / safe colours" checked={s.colorblind} onChange={v => set({ colorblind: v })} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
