import type { HTMLAttributes, ReactNode } from 'react';
import type { Tone } from '../../../types/theme';

export type { Tone };

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Fixed light-on-dark styling instead of theme-reactive tokens — for
   * placements on the app's fixed-black camera scrims (e.g. VictoryScreen),
   * which don't follow the Theme setting (see Stage.tsx). */
  onDark?: boolean;
  children: ReactNode;
}

const TONE_STYLES: Record<Tone, string> = {
  accent: 'bg-accent/15 text-accent-text border-accent/30',
  success: 'bg-success/15 text-success-text border-success/30',
  warning: 'bg-warning/15 text-warning-text border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  neutral: 'bg-surface-strong text-muted border-border-strong',
};

const TONE_STYLES_ON_DARK: Record<Tone, string> = {
  accent: 'bg-accent/20 text-on-dark-accent border-accent/40',
  success: 'bg-success/20 text-on-dark-success border-success/40',
  warning: 'bg-warning/20 text-on-dark-warning border-warning/40',
  danger: 'bg-danger/20 text-on-dark-danger border-danger/40',
  neutral: 'bg-white/10 text-white/80 border-white/20',
};

/** Small pill for tags, status chips, and achievement/streak indicators — token-tone driven, no hardcoded ramps. */
export function Badge({ tone = 'neutral', onDark = false, className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${onDark ? TONE_STYLES_ON_DARK[tone] : TONE_STYLES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
