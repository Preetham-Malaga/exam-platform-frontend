// PURPOSE: Pill badges (prototype .pill .b-ok / .b-warn / .b-bad / .b-lav / .b-neutral …) and a mapper for known statuses.
// WHY: Result, exam and account statuses must look the same on every page.
// DEPENDS ON: utils/cn.ts.

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'sky' | 'dark';
const TONES: Record<BadgeTone, string> = {
  success: 'bg-mint text-mint-ink',
  warning: 'bg-butter text-butter-ink',
  error: 'bg-danger-bg text-danger',
  info: 'bg-lav text-lav-ink',
  neutral: 'bg-bg text-ink',
  sky: 'bg-sky text-sky-ink',
  dark: 'bg-primary text-on-primary',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  published: 'success',
  passed: 'success',
  completed: 'success',
  trialing: 'info',
  draft: 'warning',
  inactive: 'neutral',
  unpublished: 'warning',
  pending: 'warning',
  pending_email: 'warning',
  invited: 'sky',
  in_progress: 'info',
  failed: 'error',
  suspended: 'error',
  disabled: 'error',
  closed: 'neutral',
  canceled: 'error',
  expired: 'error',
  past_due: 'warning',
  archived: 'neutral',
};

/** Renders a known status string with its tone; unknown values fall back to neutral. data-state carries the raw value. */
export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  return (
    <Badge tone={STATUS_TONE[status.toLowerCase()] ?? 'neutral'}>
      <span data-state={status.toLowerCase()}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </span>
    </Badge>
  );
}
