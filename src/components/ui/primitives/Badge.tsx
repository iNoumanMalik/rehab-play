import type { HTMLAttributes, ReactNode } from 'react';
import type { Tone } from '../../../types/theme';

export type { Tone };

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

const TONE_STYLES: Record<Tone, string> = {
  accent: 'bg-accent/15 text-accent-text border-accent/30',
  success: 'bg-success/15 text-success-text border-success/30',
  warning: 'bg-warning/15 text-warning-text border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  neutral: 'bg-surface-strong text-muted border-border-strong',
};

/** Small pill for tags, status chips, and achievement/streak indicators — token-tone driven, no hardcoded ramps. */
export function Badge({ tone = 'neutral', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${TONE_STYLES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
