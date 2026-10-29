// PURPOSE: The prototype's full-page form (vForm): breadcrumb + title, an error summary, sections as cards, and a sticky
//          bar with the field count, Cancel and Save. Also ChoicePills (single-choice pills).
// WHY: Every add / edit screen has its own route and must look and behave the same: errors show on save, the summary
//      lists every invalid field and focuses it on click, and the first invalid field gets focus.
// DEPENDS ON: layout/PageHeader.tsx, layout/PageRoot.tsx, ui/Button.tsx. Locators: docs/locators.md → "Form pages".

import type { FormEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, type Crumb } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-|-$/g, '');

export function FormSection({
  prefix,
  title,
  children,
}: {
  prefix: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="flex min-w-0 flex-col gap-3.5 rounded-card bg-surface p-[22px]"
      data-testid={`${prefix}-section-${slug(title)}`}
    >
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        {children}
      </div>
    </section>
  );
}

/** Single-choice pills (prototype "radio" fields): each pill is <prefix>-<field>-radio with data-value. */
export function ChoicePills({
  label,
  value,
  options,
  onChange,
  testId,
  required,
  className,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  testId: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-xs font-bold text-muted">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o)}
              data-testid={testId}
              data-value={o}
              className={cn(
                'min-h-[38px] rounded-full border-[1.5px] px-3.5 text-[13px] font-bold',
                on
                  ? 'border-transparent bg-primary text-on-primary'
                  : 'border-border bg-bg text-ink',
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FormPage({
  prefix,
  pageId,
  breadcrumb,
  title,
  ready = true,
  errors,
  onFocusField,
  onSubmit,
  fieldCount,
  cancelTo,
  saveLabel,
  saving,
  extraActions,
  serverError,
  children,
}: {
  /** Locator prefix, e.g. "course-form" → course-form-save-btn, course-form-error-summary. */
  prefix: string;
  pageId: `page-${string}`;
  breadcrumb: Crumb[];
  title: string;
  ready?: boolean;
  /** Invalid fields after a save attempt, in form order: [key, label]. */
  errors: Array<[string, string]>;
  onFocusField: (key: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  fieldCount: number;
  cancelTo: string;
  saveLabel: string;
  saving?: boolean;
  extraActions?: ReactNode;
  serverError?: string | null;
  children: ReactNode;
}) {
  const n = errors.length;
  return (
    <PageRoot testId={pageId} ready={ready} className="flex flex-col gap-4">
      <PageHeader
        breadcrumb={breadcrumb}
        title={title}
        description={
          <>
            Fields marked <span className="text-danger">*</span> are required. Errors show as soon
            as you save.
          </>
        }
      />
      {n > 0 && (
        <div
          role="alert"
          className="rounded-2xl bg-danger-bg px-3.5 py-3 text-[13px] font-semibold text-danger"
          data-testid={`${prefix}-error-summary`}
        >
          <b>
            Fix {n} {n === 1 ? 'field' : 'fields'} to save:
          </b>{' '}
          {errors.map(([k, label], i) => (
            <span key={k}>
              {i > 0 && ' · '}
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent px-1 font-bold text-inherit underline"
                onClick={() => onFocusField(k)}
                data-testid={`${prefix}-error-summary-link`}
                data-value={k}
              >
                {label}
              </button>
            </span>
          ))}
        </div>
      )}
      {serverError && (
        <p
          role="alert"
          className="m-0 rounded-2xl bg-danger-bg px-3.5 py-3 text-[13px] font-semibold text-danger"
          data-testid={`${prefix}-server-error`}
        >
          {serverError}
        </p>
      )}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4" data-testid={prefix}>
        {children}
        <div
          className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface px-[18px] py-3.5 shadow-[0_10px_30px_rgba(20,16,40,.14)]"
          data-testid={`${prefix}-actions`}
        >
          <span
            className={cn('text-xs font-semibold', n ? 'text-danger' : 'text-muted')}
            data-testid={`${prefix}-status`}
          >
            {n
              ? `${n} ${n === 1 ? 'field needs' : 'fields need'} attention`
              : `${fieldCount} fields · * required`}
          </span>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to={cancelTo}
              className="inline-flex min-h-[44px] items-center rounded-full bg-bg px-[18px] font-bold text-ink hover:no-underline"
              data-testid={`${prefix}-cancel-btn`}
            >
              Cancel
            </Link>
            {extraActions}
            <Button type="submit" loading={Boolean(saving)} data-testid={`${prefix}-save-btn`}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </form>
    </PageRoot>
  );
}
