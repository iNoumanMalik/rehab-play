import type { Tone } from '../../types/theme';
import { Panel } from './primitives/Panel';

interface StatCardProps {
  value: string | number;
  label: string;
  tone?: Tone;
  id?: string;
  /** Fixed light-on-dark styling instead of theme-reactive tokens — for
   * placements on the app's fixed-black camera scrims (e.g. VictoryScreen),
   * which don't follow the Theme setting (see Stage.tsx). */
  onDark?: boolean;
}

const TONE_TEXT: Record<Tone, string> = {
  accent: 'text-accent-text',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger',
  neutral: 'text-text',
};

const TONE_TEXT_ON_DARK: Record<Tone, string> = {
  accent: 'text-on-dark-accent',
  success: 'text-on-dark-success',
  warning: 'text-on-dark-warning',
  danger: 'text-on-dark-danger',
  neutral: 'text-white',
};

export function StatCard({ value, label, tone = 'neutral', id, onDark = false }: StatCardProps) {
  const valueClass = `text-3xl sm:text-4xl lg:text-5xl font-extrabold ${onDark ? TONE_TEXT_ON_DARK[tone] : TONE_TEXT[tone]} mb-1 sm:mb-2 tabular-nums tracking-tight font-display`;
  const labelClass = `text-[10px] sm:text-xs font-bold uppercase tracking-wider ${onDark ? 'text-white/60' : 'text-muted'}`;

  if (onDark) {
    return (
      <div className="bg-black/40 border border-white/15 rounded-card p-4 sm:p-6 text-center">
        <div id={id} className={valueClass} aria-live="polite">{value}</div>
        <div className={labelClass}>{label}</div>
      </div>
    );
  }

  return (
    <Panel className="p-4 sm:p-6 text-center">
      <div id={id} className={valueClass} aria-live="polite">{value}</div>
      <div className={labelClass}>{label}</div>
    </Panel>
  );
}
