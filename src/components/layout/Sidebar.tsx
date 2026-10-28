// PURPOSE: The navigation list (236px dark sidebar on desktop, light variant in the mobile menu) with collapsible groups.
// WHY: Same navigation component for both layouts; items come from utils/navigation.ts already filtered by permission.
//      A titled section is a group (Syllabus, Exams, People ...): the group holding the current page is open, the
//      others can be opened and closed, and that choice is remembered on this browser.
// DEPENDS ON: React Router NavLink, ui/Icon.tsx, utils/navigation.ts types.

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/utils/cn';
import { navTestId, slug } from '@/utils/testid';
import type { NavItem, NavSection } from '@/utils/navigation';

const STORAGE_KEY = 'nav-open-groups';

function readOpen(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

const isActive = (item: NavItem, path: string) =>
  path === item.to || (!item.end && path.startsWith(`${item.to}/`));

export function SidebarNav({
  sections,
  variant = 'dark',
  onNavigate,
}: {
  sections: NavSection[];
  variant?: 'dark' | 'light';
  onNavigate?: () => void;
}) {
  const dark = variant === 'dark';
  const { pathname } = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>(readOpen);
  const toggle = (id: string, now: boolean) => {
    const next = { ...open, [id]: !now };
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private window: the choice just is not remembered */
    }
  };

  const link = (it: NavItem, group?: string) => (
    <li key={it.to}>
      <NavLink
        to={it.to}
        end={it.end ?? false}
        data-testid={navTestId(it.to, group)}
        {...(onNavigate ? { onClick: onNavigate } : {})}
        className={({ isActive: active }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            dark
              ? active
                ? 'bg-white/15 text-white'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
              : active
                ? 'bg-secondary/30 text-primary'
                : 'text-text hover:bg-background',
          )
        }
      >
        <Icon name={it.icon} size={18} />
        <span>{it.label}</span>
      </NavLink>
    </li>
  );

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1" data-testid="nav">
      {sections.map((s, i) => {
        if (!s.title)
          return (
            <ul key={i} className="mb-2 flex flex-col gap-0.5">
              {s.items.map((it) => link(it))}
            </ul>
          );
        const id = s.id ?? slug(s.title);
        const holdsCurrent = s.items.some((it) => isActive(it, pathname));
        // The current page's group is always open; other groups follow the user's choice (closed by default).
        const expanded = holdsCurrent || (open[id] ?? false);
        return (
          <div key={id} data-testid={`nav-${id}-group`}>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`nav-group-${id}`}
              disabled={holdsCurrent}
              title={holdsCurrent ? 'This group holds the page you are on' : undefined}
              onClick={() => toggle(id, expanded)}
              data-testid={`nav-${id}-group-btn`}
              data-expanded={expanded}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider',
                dark ? 'text-white/60 hover:text-white' : 'text-muted hover:text-text',
                holdsCurrent && 'cursor-default',
              )}
            >
              {s.title}
              <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} />
            </button>
            {expanded && (
              <ul id={`nav-group-${id}`} className="mb-2 flex flex-col gap-0.5">
                {s.items.map((it) => link(it, id))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Desktop sidebar: fixed 236px wide column with the product name on top. */
export function Sidebar({
  sections,
  organizationName,
}: {
  sections: NavSection[];
  organizationName?: string;
}) {
  return (
    <aside className="sidebar-scroll fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col overflow-y-auto bg-primary px-3 py-4 lg:flex">
      <div className="mb-5 px-3">
        <p className="text-lg font-bold text-white">{APP_NAME}</p>
        {organizationName && <p className="truncate text-xs text-white/60">{organizationName}</p>}
      </div>
      <SidebarNav sections={sections} />
    </aside>
  );
}
