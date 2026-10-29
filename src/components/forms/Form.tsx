// PURPOSE: Form controls (Field wrapper, Input, Select, Textarea, Checkbox, Radio) that work with React Hook Form.
// WHY: Labels, error text and aria attributes are wired once, so every form is accessible by default.
// DEPENDS ON: utils/cn.ts. Used by every form in the app.

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/utils/cn';
import { testIdBase } from '@/utils/testid';

const control =
  'w-full min-w-0 rounded-input border-[1.5px] bg-surface-2 px-3.5 text-ink placeholder:text-muted/80 ' +
  'focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-focus disabled:cursor-not-allowed disabled:opacity-70';

interface FieldShellProps {
  label: string;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  className?: string;
  /** Goes on the control itself; its -error and -hint messages get matching ids (login-email-input → login-email-error). */
  'data-testid'?: string;
}

/** Wraps a control with a label, hint and error message; returns ids for aria wiring. */
export function Field({
  label,
  error,
  hint,
  required,
  className,
  'data-testid': testId,
  children,
}: FieldShellProps & {
  children: (a: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const base = testIdBase(testId);
  const describedBy =
    [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-bold text-muted">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, ...(describedBy ? { describedBy } : {}), invalid: Boolean(error) })}
      {hint && !error && (
        <p
          id={`${id}-hint`}
          className="text-xs font-semibold text-muted"
          data-testid={base ? `${base}-hint` : undefined}
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-err`}
          role="alert"
          className="text-xs font-semibold text-danger"
          data-testid={base ? `${base}-error` : undefined}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> &
    FieldShellProps & {
      /** Decorative icon inside the field, on the left. */
      leftIcon?: ReactNode;
      /** Interactive element inside the field, on the right (e.g. a show-password button). */
      rightSlot?: ReactNode;
    }
>(function Input(
  { label, error, hint, required, className, leftIcon, rightSlot, 'data-testid': testId, ...rest },
  ref,
) {
  return (
    <Field
      label={label}
      error={error}
      data-testid={testId}
      {...(hint ? { hint } : {})}
      {...(required ? { required } : {})}
      {...(className ? { className } : {})}
    >
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className={cn(
              control,
              'h-10',
              Boolean(leftIcon) && 'pl-10',
              Boolean(rightSlot) && 'pr-11',
              invalid ? 'border-error' : 'border-border',
            )}
            data-testid={testId}
            {...rest}
          />
          {rightSlot && (
            <span className="absolute inset-y-0 right-1.5 flex items-center">{rightSlot}</span>
          )}
        </div>
      )}
    </Field>
  );
});

/** Password field with a lock icon and a show/hide toggle. */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & FieldShellProps & { leftIcon?: ReactNode }
>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  const base = testIdBase(props['data-testid']);
  return (
    <Input
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          className="rounded-md p-1.5 text-muted hover:bg-background hover:text-text"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          data-testid={base ? `${base}-toggle-btn` : undefined}
          onClick={() => setVisible((v) => !v)}
        >
          <EyeIcon off={visible} />
        </button>
      }
    />
  );
});

function EyeIcon({ off }: { off: boolean }) {
  // Inline (not components/ui/Icon) so the forms module keeps no dependency on the UI kit.
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {off ? (
        <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
      ) : (
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      )}
    </svg>
  );
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> &
    FieldShellProps & {
      options: ReadonlyArray<{ value: string; label: string }>;
      placeholder?: string;
    }
>(function Select(
  { label, error, hint, required, className, options, placeholder, 'data-testid': testId, ...rest },
  ref,
) {
  const base = testIdBase(testId);
  // Every option shares one id; QA picks one by its data-value, never by its visible text.
  const optionId = base ? `${base}-option` : undefined;
  return (
    <Field
      label={label}
      error={error}
      data-testid={testId}
      {...(hint ? { hint } : {})}
      {...(required ? { required } : {})}
      {...(className ? { className } : {})}
    >
      {({ id, describedBy, invalid }) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(control, 'h-10', invalid ? 'border-error' : 'border-border')}
          data-testid={testId}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" data-testid={optionId} data-value="">
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} data-testid={optionId} data-value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldShellProps
>(function Textarea(
  { label, error, hint, required, className, rows = 4, 'data-testid': testId, ...rest },
  ref,
) {
  return (
    <Field
      label={label}
      error={error}
      data-testid={testId}
      {...(hint ? { hint } : {})}
      {...(required ? { required } : {})}
      {...(className ? { className } : {})}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(control, 'py-2', invalid ? 'border-error' : 'border-border')}
          data-testid={testId}
          {...rest}
        />
      )}
    </Field>
  );
});

export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; description?: string }
>(function Checkbox({ label, description, className, ...rest }, ref) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        aria-describedby={description ? `${id}-d` : undefined}
        className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
        {...rest}
      />
      <label htmlFor={id} className="text-sm text-text">
        {label}
        {description && (
          <span id={`${id}-d`} className="block text-xs text-muted">
            {description}
          </span>
        )}
      </label>
    </div>
  );
});

export const Radio = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }
>(function Radio({ label, className, ...rest }, ref) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        ref={ref}
        id={id}
        type="radio"
        className="h-4 w-4 border-border accent-primary"
        {...rest}
      />
      <label htmlFor={id} className="text-sm text-text">
        {label}
      </label>
    </div>
  );
});
