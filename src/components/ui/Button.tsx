// PURPOSE: The one button used everywhere (variants, sizes, loading state), styled as the prototype's pill buttons.
// WHY: Consistent look and behaviour (focus ring, disabled while loading, aria-busy) without repeating classes.
// DEPENDS ON: utils/cn.ts, theme tokens. Used by forms, tables, pages.

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

// Prototype: .btn-primary / .btn-secondary / .btn-ghost (= outline here) / .btn-danger; "ghost" is the icon button.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90',
  secondary: 'bg-lav text-lav-ink hover:bg-lav/80',
  outline: 'bg-bg text-ink hover:bg-border/70',
  danger: 'bg-danger text-surface hover:bg-danger/90',
  ghost: 'bg-transparent text-muted hover:bg-bg hover:text-ink',
};
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 text-[13px]',
  md: 'min-h-11 px-[18px] text-sm',
};

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
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-0 font-bold transition-colors',
        'disabled:cursor-not-allowed disabled:bg-border disabled:text-muted',
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
