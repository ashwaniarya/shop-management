import type { ComponentProps, ReactNode } from 'react';

import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'outline-danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

// ComponentProps<'button'> (not ButtonHTMLAttributes) so `ref` is accepted and
// carried through the {...rest} spread onto the DOM button (React 19 ref-as-prop).
interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-ink-950 hover:bg-accent-400 active:bg-accent-600 disabled:hover:bg-accent-500',
  secondary:
    'border border-ink-700 bg-ink-850 text-ink-100 hover:border-ink-600 hover:bg-ink-800 active:bg-ink-750',
  'outline-danger':
    'border border-accent-700 text-accent-400 hover:bg-accent-950 active:bg-accent-900',
  ghost: 'text-ink-300 hover:bg-ink-850 hover:text-ink-100',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <Spinner /> : null}
      {children}
    </button>
  );
}
