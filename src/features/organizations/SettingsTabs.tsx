// PURPOSE: Organization Profile tabs from the prototype (vOrg): the organization's colour theme (Branding) and
//          Date & time (date format, time format, time zone, week start) with a live preview.
// WHY: These apply to everyone in the organization: tables, exam windows, class schedules and the dashboard. A person can
//      still pick their own colours in the sidebar's Appearance. Saved with PATCH /organizations/current/settings.
// DEPENDS ON: features/organizations/hooks.ts, features/appearance/appearance.ts, utils/dates.ts.

import { useState } from 'react';
import { useToast } from '@/components/feedback/Toast';
import { Select } from '@/components/forms/Form';
import { Button } from '@/components/ui/Button';
import { usePermissionsOptional } from '@/contexts/PermissionContext';
import {
  BRANDS,
  hasOwnBrand,
  applyAppearance,
  readAppearance,
} from '@/features/appearance/appearance';
import { errorText } from '@/features/academic/ui';
import type { Branding, Organization } from '@/types/organization';
import { cn } from '@/utils/cn';
import { fmtDate, fmtTime, setDatePreferences, type DateFormat } from '@/utils/dates';
import { useUpdateBranding } from './hooks';

const SAMPLE = '2026-10-28T13:35:00Z';
const DATE_FORMATS: DateFormat[] = [
  'DD-MM-YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'DD MMM YYYY',
];
const ZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York'];

export function ThemeSettings({ org }: { org: Organization }) {
  const { toast } = useToast();
  const perms = usePermissionsOptional();
  const update = useUpdateBranding();
  const current = org.branding.theme ?? 'violet';
  const choose = (theme: NonNullable<Branding['theme']>) =>
    update.mutate(
      { branding: { theme } },
      {
        onSuccess: () => {
          if (!hasOwnBrand()) applyAppearance({ ...readAppearance(), brand: theme });
          toast({ title: 'Theme applied for everyone', variant: 'success' });
        },
        onError: (e) =>
          toast({ title: 'Could not save', description: errorText(e), variant: 'error' }),
      },
    );
  return (
    <div className="flex flex-col gap-2" data-testid="org-branding-theme">
      <span className="text-xs font-bold text-muted">
        Theme · applied to the admin app, teacher app, student portal and dashboard
      </span>
      <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-3">
        {BRANDS.map((b) => (
          <button
            key={b.value}
            type="button"
            role="radio"
            aria-checked={current === b.value}
            disabled={!(perms?.can('settings.update') ?? true) || update.isPending}
            onClick={() => choose(b.value)}
            className={cn(
              'flex min-w-[130px] flex-col gap-2 rounded-[18px] border-2 bg-surface-2 p-3 text-left font-bold',
              current === b.value ? 'border-focus' : 'border-border',
            )}
            data-testid={`org-branding-theme-${b.value}-option`}
          >
            <span className="flex gap-1">
              {b.dots.map((c) => (
                <i key={c} className="block h-5 w-5 rounded-full" style={{ background: c }} />
              ))}
            </span>
            {b.label}
          </button>
        ))}
      </div>
      <span className="text-xs font-semibold text-muted">
        Text colours stay readable in every theme. Light or dark follows each person's Appearance
        setting.
      </span>
    </div>
  );
}

export function DateTimeSettings({ org }: { org: Organization }) {
  const { toast } = useToast();
  const perms = usePermissionsOptional();
  const update = useUpdateBranding();
  const [v, setV] = useState({
    dateFormat: org.branding.dateFormat ?? 'DD-MM-YYYY',
    timeFormat: org.branding.timeFormat ?? '12',
    weekStart: org.branding.weekStart ?? 'Monday',
    timezone: org.timezone,
  });
  const dirty =
    v.dateFormat !== (org.branding.dateFormat ?? 'DD-MM-YYYY') ||
    v.timeFormat !== (org.branding.timeFormat ?? '12') ||
    v.weekStart !== (org.branding.weekStart ?? 'Monday') ||
    v.timezone !== org.timezone;
  const save = () =>
    update.mutate(
      {
        branding: { dateFormat: v.dateFormat, timeFormat: v.timeFormat, weekStart: v.weekStart },
        timezone: v.timezone,
      },
      {
        onSuccess: () => {
          setDatePreferences({ dateFormat: v.dateFormat, timeFormat: v.timeFormat });
          toast({ title: 'Date & time format updated everywhere', variant: 'success' });
        },
        onError: (e) =>
          toast({ title: 'Could not save', description: errorText(e), variant: 'error' }),
      },
    );
  const disabled = !(perms?.can('settings.update') ?? true);
  return (
    <div className="grid max-w-2xl gap-4" data-testid="org-datetime-card">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Date format"
          value={v.dateFormat}
          disabled={disabled}
          options={DATE_FORMATS.map((f) => ({
            value: f,
            label: `${f} · ${fmtDate('2026-10-28', f)}`,
          }))}
          onChange={(e) => setV({ ...v, dateFormat: e.target.value as DateFormat })}
          data-testid="org-datetime-date-format-select"
        />
        <Select
          label="Time format"
          value={v.timeFormat}
          disabled={disabled}
          options={[
            { value: '12', label: `12-hour · ${fmtTime(SAMPLE, '12')}` },
            { value: '24', label: `24-hour · ${fmtTime(SAMPLE, '24')}` },
          ]}
          onChange={(e) => setV({ ...v, timeFormat: e.target.value as '12' | '24' })}
          data-testid="org-datetime-time-format-select"
        />
        <Select
          label="Time zone"
          value={v.timezone}
          disabled={disabled}
          options={[...new Set([v.timezone, ...ZONES])].map((z) => ({ value: z, label: z }))}
          onChange={(e) => setV({ ...v, timezone: e.target.value })}
          data-testid="org-datetime-timezone-select"
        />
        <Select
          label="Week starts on"
          value={v.weekStart}
          disabled={disabled}
          options={[
            { value: 'Monday', label: 'Monday' },
            { value: 'Sunday', label: 'Sunday' },
          ]}
          onChange={(e) => setV({ ...v, weekStart: e.target.value as 'Monday' | 'Sunday' })}
          data-testid="org-datetime-week-start-select"
        />
      </div>
      <div className="rounded-row bg-row px-3 py-2.5" data-testid="org-datetime-preview">
        <span className="block text-xs text-muted">
          Preview — tables, exam windows, class schedules and the dashboard use this
        </span>
        <b className="num">
          {fmtDate('2026-10-28', v.dateFormat)} · {fmtTime(SAMPLE, v.timeFormat)}
        </b>
      </div>
      {!disabled && (
        <div>
          <Button
            onClick={save}
            disabled={!dirty}
            loading={update.isPending}
            data-testid="org-datetime-save-btn"
          >
            Save date & time
          </Button>
        </div>
      )}
    </div>
  );
}
