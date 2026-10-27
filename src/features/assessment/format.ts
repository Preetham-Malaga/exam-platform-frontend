// PURPOSE: Display helpers shared by the question, exam, result and dashboard screens.
// WHY: Durations, dates, percentages and status colours must read the same everywhere.
// DEPENDS ON: components/ui/Badge.tsx (tone names).

import type { BadgeTone } from '@/components/ui/Badge';

export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return '—';
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${r}s`;
  return `${r}s`;
};

export const formatDateTime = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const formatPercent = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${Number(v.toFixed(2))}%`;

export const DIFFICULTY_TONE: Record<string, BadgeTone> = {
  easy: 'success',
  medium: 'warning',
  hard: 'error',
};
export const RESULT_TONE: Record<string, BadgeTone> = {
  Passed: 'success',
  Failed: 'error',
  Pending: 'warning',
};
export const TYPE_LABEL: Record<string, string> = {
  multiple_choice: 'Multiple choice',
  true_false: 'True / false',
};

/** "MM:SS" (or "H:MM:SS") countdown text. */
export const clock = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
};

/** `datetime-local` input value (local time, no seconds) <-> ISO string. */
export const toLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);
