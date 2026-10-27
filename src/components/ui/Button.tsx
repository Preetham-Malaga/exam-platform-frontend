// PURPOSE: The one button used everywhere (variants, sizes, loading state).
// WHY: Consistent look and behaviour (focus ring, disabled while loading, aria-busy) without repeating classes.
// DEPENDS ON: utils/cn.ts, theme tokens. Used by forms, dialogs, tables, pages.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 border border-transparent',
  secondary: 'bg-secondary/30 text-primary hover:bg-secondary/50 border border-transparent',
  outline: 'bg-card text-text border border-border hover:bg-background',
  danger: 'bg-error text-white hover:bg-error/90 border border-transparent',
  ghost: 'bg-transparent text-muted hover:bg-background hover:text-text border border-transparent',
};
const SIZES: Record<ButtonSize, string> = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  );
});
