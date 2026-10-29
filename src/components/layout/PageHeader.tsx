// PURPOSE: The prototype page header (.ph): breadcrumb, a large title, a description and the page's actions.
//          Also exports Breadcrumb. The signed-in person is shown in the sidebar, not here.
// WHY: Every page starts the same way; one header keeps titles, spacing and heading levels consistent (one h1 per page).
// DEPENDS ON: React Router (Link).

import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs font-semibold text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              <li>
                {c.to && !last ? (
                  <Link
                    to={c.to}
                    className="font-bold text-accent hover:underline"
                    data-testid="breadcrumb-link"
                    data-to={c.to}
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined}>{c.label}</span>
                )}
              </li>
              {!last && <li aria-hidden="true">›</li>}
            </Fragment>
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
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: Crumb[];
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3.5" data-testid="page-header">
      <div className="min-w-0">
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        <h1 className="font-display text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em]">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-[62ch] text-muted">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {actions}
      </div>
    </header>
  );
}
