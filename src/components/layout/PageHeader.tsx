// PURPOSE: Page title block with optional breadcrumb and action buttons, plus the Breadcrumb component.
// WHY: Every page starts the same way; one header keeps titles, spacing and heading levels consistent (one h1 per page).
// DEPENDS ON: React Router (Link), ui/Icon.tsx.

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1" data-testid="breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {c.to && !last ? (
                <Link
                  to={c.to}
                  className="hover:text-primary hover:underline"
                  data-testid="breadcrumb-link"
                  data-to={c.to}
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={last ? 'text-text' : undefined}
                >
                  {c.label}
                </span>
              )}
              {!last && <Icon name="chevronRight" size={12} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: Crumb[];
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        <h1 className="text-[22px] font-bold text-text">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
