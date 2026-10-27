// PURPOSE: Card surfaces (Card, StatCard, ChartCard) in the POC style (white, 12px radius, light border).
// WHY: Dashboards, forms and reports all sit on cards; one definition keeps spacing and borders identical.
// DEPENDS ON: components/feedback/States.tsx, utils/cn.ts.

import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { cn } from '@/utils/cn';
import { Icon, type IconName } from './Icon';

export function Card({
  title,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn('rounded-card border border-border bg-card shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          {title && <h2 className="text-[15px] font-semibold text-text">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cn(padded && 'p-5')}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  loading,
}: {
  label: string;
  value: ReactNode;
  icon?: IconName;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-card p-5 shadow-sm">
      {icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/30 text-primary">
          <Icon name={icon} size={22} />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[13px] text-muted">{label}</p>
        <p className="text-2xl font-bold text-text" aria-busy={loading || undefined}>
          {loading ? (
            <span
              className="inline-block h-7 w-16 animate-pulse rounded bg-background"
              aria-label="Loading"
            />
          ) : (
            value
          )}
        </p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  loading,
  error,
  empty,
  children,
  onRetry,
}: {
  title: string;
  loading?: boolean;
  error?: string | undefined;
  empty?: boolean;
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <Card title={title}>
      {loading ? (
        <LoadingState compact />
      ) : error ? (
        <ErrorState message={error} {...(onRetry ? { onRetry } : {})} compact />
      ) : empty ? (
        <EmptyState title="No data yet" compact />
      ) : (
        children
      )}
    </Card>
  );
}
