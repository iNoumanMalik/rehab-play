import type { HTMLAttributes, ReactNode } from 'react';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Slightly more opaque surface, for panels that need to stand out (e.g. modals). */
  strong?: boolean;
}

/** The standard token-driven surface container — replaces ad-hoc bg-[var(--color-surface)] card divs. */
export function Panel({ children, strong = false, className = '', ...rest }: PanelProps) {
  return (
    <div
      {...rest}
      className={`${strong ? 'bg-surface-strong border-border-strong' : 'bg-surface border-border'} border rounded-card shadow-1 ${className}`}
    >
      {children}
    </div>
  );
}
