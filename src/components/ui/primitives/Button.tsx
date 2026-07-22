import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-accent hover:bg-accent-strong text-white border border-transparent shadow-1',
  secondary: 'bg-surface-strong hover:bg-surface-hover text-text border border-border-strong',
  ghost: 'bg-black/40 hover:bg-black/55 text-white border border-white/20 backdrop-blur-md',
  danger: 'bg-surface-strong hover:bg-danger/15 text-text hover:text-danger border border-border-strong hover:border-danger/40',
};

const SIZE_STYLES: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-xs sm:text-sm rounded-full gap-1.5',
  md: 'px-6 py-3 text-sm sm:text-base rounded-2xl gap-2',
  lg: 'px-8 py-3.5 text-base sm:text-lg rounded-2xl gap-2.5',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center font-bold transition-all duration-[var(--dur-base)] ease-[var(--ease-standard)] cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus-ring)]/40 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
    >
      {children}
    </button>
  );
}
