import type { Tone } from '../../types/theme';
import { Panel } from './primitives/Panel';

interface StatCardProps {
  value: string | number;
  label: string;
  tone?: Tone;
  id?: string;
}

const TONE_TEXT: Record<Tone, string> = {
  accent: 'text-accent-text',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger',
  neutral: 'text-text',
};

export function StatCard({ value, label, tone = 'neutral', id }: StatCardProps) {
  return (
    <Panel className="p-4 sm:p-6 text-center">
      <div
        id={id}
        className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold ${TONE_TEXT[tone]} mb-1 sm:mb-2 tabular-nums tracking-tight font-display`}
        aria-live="polite"
      >
        {value}
      </div>
      <div className="text-[10px] sm:text-xs text-muted font-bold uppercase tracking-wider">
        {label}
      </div>
    </Panel>
  );
}
