// PURPOSE: The prototype page header (.ph): breadcrumb, a large title, a description, the page's actions and the
//          signed-in person's pill on the right. Also exports Breadcrumb.
// WHY: Every page starts the same way; one header keeps titles, spacing and heading levels consistent (one h1 per page).
// DEPENDS ON: React Router (Link), shellUser.ts (user pill), ui/Avatar.tsx.

import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { useShellUser } from './shellUser';

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

/** The signed-in person (prototype .user-pill), shown at the right of every page header. */
export function UserPill() {
  const user = useShellUser();
  if (!user) return null;
  return (
    <div
      className="flex items-center gap-2.5 rounded-full bg-surface py-1 pl-1 pr-3.5"
      data-testid="header-user-pill"
    >
      <Avatar name={user.name} />
      <div className="min-w-0">
        <b className="block truncate" data-testid="header-user-name">
          {user.name}
        </b>
        {user.email && (
          <small className="block truncate text-xs text-muted" data-testid="header-user-email">
            {user.email}
          </small>
        )}
      </div>
    </div>
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
        <UserPill />
      </div>
    </header>
  );
}
