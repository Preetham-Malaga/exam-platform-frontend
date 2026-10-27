// PURPOSE: Empty, loading and error states used by every list, table and card.
// WHY: Every data screen must handle loading/error/empty; shared components make that the path of least resistance.
// DEPENDS ON: components/ui/Icon.tsx, Button.tsx.

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

const wrap = (compact?: boolean) =>
  cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-16');

export function LoadingState({
  label = 'Loading…',
  compact,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div role="status" aria-live="polite" className={wrap(compact)}>
      <span
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-secondary border-t-primary"
        aria-hidden="true"
      />
      <p className="mt-3 text-sm text-muted">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  action,
  compact,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={wrap(compact)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="mt-3 text-[15px] font-semibold text-text">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  compact,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div role="alert" className={wrap(compact)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
        <Icon name="alert" size={22} />
      </span>
      <h3 className="mt-3 text-[15px] font-semibold text-text">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
