// PURPOSE: The prototype's sidebar card: brand, collapsible menu groups (Overview, Academics, People …) and the
//          signed-in person with a Log out button. Below 860 px it becomes a card on top whose menu opens in place.
// WHY: Items come from utils/navigation.ts already filtered by permission. The group holding the current page is always
//      open; other groups open and close on click, remembered per person on this browser.
// DEPENDS ON: React Router NavLink, ui/Icon.tsx, ui/Avatar.tsx, shellUser.ts, utils/navigation.ts types.

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/utils/cn';
import type { NavItem, NavSection } from '@/utils/navigation';
import type { ShellUser } from './shellUser';

const storageKey = (user?: ShellUser) => `nav-open-groups:${user?.email ?? 'anon'}`;
function readOpen(key: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

const isActive = (item: NavItem, path: string) =>
  path === item.to || (!item.end && path.startsWith(`${item.to}/`));

export function SidebarNav({
  sections,
  user,
  onNavigate,
}: {
  sections: NavSection[];
  user?: ShellUser;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const key = storageKey(user);
  const [open, setOpen] = useState<Record<string, boolean>>(() => readOpen(key));
  const toggle = (id: string, now: boolean) => {
    const next = { ...open, [id]: !now };
    setOpen(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* private window: the choice just is not remembered */
    }
  };

  const link = (it: NavItem) => (
    <NavLink
      key={it.to}
      to={it.to}
      end={it.end ?? false}
      title={it.label}
      data-testid={`nav-${it.key}-link`}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={({ isActive: active }) =>
        cn(
          'flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-[9px] font-semibold no-underline',
          active ? 'bg-primary font-bold text-on-primary' : 'text-ink hover:bg-bg',
        )
      }
    >
      <Icon name={it.icon} size={18} />
      <span>{it.label}</span>
    </NavLink>
  );

  return (
    <nav aria-label="Main" className="flex flex-col gap-1" data-testid="nav">
      {sections.map((s, i) => {
        if (!s.title)
          return (
            <div key={i} className="flex flex-col gap-0.5">
              {s.items.map(link)}
            </div>
          );
        const id = s.id ?? s.title.toLowerCase().replace(/\s+/g, '-');
        const holdsCurrent = s.items.some((it) => isActive(it, pathname));
        const shown = (open[id] ?? false) || holdsCurrent;
        return (
          <div key={id}>
            <button
              type="button"
              aria-expanded={shown}
              aria-controls={`nav-group-${id}`}
              onClick={() => toggle(id, open[id] ?? false)}
              data-testid={`nav-${id}-group-btn`}
              data-active={holdsCurrent}
              className="mt-1.5 flex min-h-[34px] w-full items-center justify-between rounded-xl px-3 text-xs font-bold tracking-[.02em] text-muted hover:bg-bg"
            >
              <span>{s.title}</span>
              <Icon name={shown ? 'chevronDown' : 'chevronRight'} size={14} />
            </button>
            {shown && (
              <div id={`nav-group-${id}`} className="flex flex-col gap-0.5 pl-2">
                {s.items.map(link)}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** The sidebar card. `open` only matters below 860 px, where the menu and footer hide until the menu button is used. */
export function Sidebar({
  sections,
  organizationName,
  user,
  onSignOut,
}: {
  sections: NavSection[];
  organizationName?: string;
  user?: ShellUser;
  onSignOut?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <aside
      className="flex w-full max-w-none flex-col gap-4 rounded-card bg-surface p-3 min-[861px]:sticky min-[861px]:top-5 min-[861px]:max-h-[calc(100vh-40px)] min-[861px]:max-w-[280px] min-[861px]:flex-[1_1_236px] min-[861px]:px-3 min-[861px]:py-5"
      data-testid="sidebar"
      data-open={menuOpen}
    >
      <div className="flex items-center gap-2.5 px-1 min-[861px]:px-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-lav text-accent">
          <Icon name="book" size={20} />
        </span>
        <div className="min-w-0">
          <b className="block font-display text-base font-extrabold">{APP_NAME}</b>
          {organizationName && (
            <span className="block truncate text-xs text-muted">{organizationName}</span>
          )}
        </div>
        <button
          type="button"
          className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink min-[861px]:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          data-testid="nav-menu-btn"
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>
      <div className={cn('flex min-h-0 flex-1 flex-col gap-4', !menuOpen && 'max-[860px]:hidden')}>
        {/* The menu scrolls on its own when it is taller than the window; brand and footer stay in view. */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
          data-testid="sidebar-scroll"
        >
          <SidebarNav
            sections={sections}
            {...(user ? { user } : {})}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
        {user && (
          <div className="mt-auto flex shrink-0 items-center gap-2.5 border-t border-border px-2 pt-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <b className="block truncate" data-testid="sidebar-user-name">
                {user.name}
              </b>
              {user.role && <small className="text-xs text-muted">{user.role}</small>}
            </div>
            {onSignOut && (
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink"
                aria-label="Log out"
                onClick={onSignOut}
                data-testid="nav-logout-btn"
              >
                <Icon name="logout" size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
