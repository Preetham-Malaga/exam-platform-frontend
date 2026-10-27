// PURPOSE: Status badges (success/warning/error/info/neutral) and a mapper for known statuses.
// WHY: Result, exam and account statuses must look the same on every page.
// DEPENDS ON: utils/cn.ts.

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';
const TONES: Record<BadgeTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-[#B45309]',
  error: 'bg-error/10 text-error',
  info: 'bg-secondary/30 text-primary',
  neutral: 'bg-background text-muted border border-border',
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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
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
  draft: 'neutral',
  inactive: 'neutral',
  unpublished: 'warning',
  pending: 'warning',
  pending_email: 'warning',
  in_progress: 'info',
  failed: 'error',
  suspended: 'error',
  closed: 'error',
  canceled: 'error',
  expired: 'error',
  past_due: 'warning',
  archived: 'neutral',
};

/** Renders a known status string with its tone; unknown values fall back to neutral. */
export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  return (
    <Badge tone={STATUS_TONE[status.toLowerCase()] ?? 'neutral'}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </Badge>
  );
}
