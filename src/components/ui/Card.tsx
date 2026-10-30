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
  testId,
  entityId,
  entityCode,
  state,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  /** Locators (docs/locators.md): repeated cards share testId and differ by entityId / entityCode. */
  testId?: string;
  entityId?: string;
  entityCode?: string;
  state?: string;
}) {
  return (
    <section
      className={cn('min-w-0 rounded-card bg-surface', className)}
      data-testid={testId}
      data-entity-id={entityId}
      data-entity-code={entityCode}
      data-state={state}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2.5 px-[22px] pt-[22px]">
          {title && <h2 className="font-display text-lg font-extrabold">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cn(padded ? 'p-[22px]' : 'pb-2', Boolean(title || actions) && 'pt-3.5')}>
        {children}
      </div>
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
    <div className="flex min-h-[132px] items-start gap-4 rounded-tile bg-lav p-5">
      {icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface text-lav-ink">
          <Icon name={icon} size={22} />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate font-bold text-lav-ink">{label}</p>
        <p
          className="num mt-2 font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-ink"
          aria-busy={loading || undefined}
        >
          {loading ? (
            <span
              className="inline-block h-10 w-20 animate-pulse rounded-xl bg-surface/70"
              aria-label="Loading"
            />
          ) : (
            value
          )}
        </p>
        {hint && (
          <p className="mt-3 inline-block rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-lav-ink">
            {hint}
          </p>
        )}
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
