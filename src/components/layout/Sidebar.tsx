// PURPOSE: The navigation list (236px dark sidebar on desktop, light variant inside the mobile drawer).
// WHY: Same navigation component for both layouts; items come from utils/navigation.ts already filtered by permission.
// DEPENDS ON: React Router NavLink, ui/Icon.tsx, utils/navigation.ts types.

import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/utils/cn';
import type { NavSection } from '@/utils/navigation';

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
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-4">
      {sections.map((s, i) => (
        <div key={s.title ?? i}>
          {s.title && (
            <p
              className={cn(
                'px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider',
                dark ? 'text-white/50' : 'text-muted',
              )}
            >
              {s.title}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {s.items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.end ?? false}
                  {...(onNavigate ? { onClick: onNavigate } : {})}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      dark
                        ? isActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                        : isActive
                          ? 'bg-secondary/30 text-primary'
                          : 'text-text hover:bg-background',
                    )
                  }
                >
                  <Icon name={it.icon} size={18} />
                  <span>{it.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
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
