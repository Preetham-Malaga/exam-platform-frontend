// PURPOSE: The authenticated page frame of the prototype: a floating white sidebar card (brand, grouped menu, the
//          signed-in person with Log out) beside the page. Below 860 px the card sits on top and its menu opens in place.
// WHY: One responsive shell for organization, teacher, student and platform areas. No pop-ups and no overlay drawer.
// DEPENDS ON: Sidebar.tsx, shellUser.ts, React Router Outlet.

import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import type { NavSection } from '@/utils/navigation';
import { ShellUserContext, type ShellUser } from './shellUser';
import { Sidebar } from './Sidebar';

export function AppShell({
  sections,
  organizationName,
  user,
  onSignOut,
  children,
}: {
  sections: NavSection[];
  organizationName?: string;
  user?: ShellUser;
  onSignOut?: () => void;
  children?: ReactNode;
}) {
  return (
    <ShellUserContext.Provider value={user ?? null}>
      <div className="min-h-screen bg-bg">
        <a
          href="#main-content"
          data-testid="skip-to-content-link"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <div className="flex flex-wrap items-start gap-5 px-4 pb-8 pt-5">
          <Sidebar
            sections={sections}
            {...(organizationName ? { organizationName } : {})}
            {...(user ? { user } : {})}
            {...(onSignOut ? { onSignOut } : {})}
          />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex min-w-0 flex-[999_1_560px] flex-col gap-[18px] focus:outline-none"
          >
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </ShellUserContext.Provider>
  );
}
