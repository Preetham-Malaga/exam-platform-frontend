// PURPOSE: The authenticated page frame: 236px sidebar (desktop, collapsible), menu panel under the topbar
//          (tablet/mobile), topbar, content.
// WHY: One responsive shell for organization, teacher, student-dashboard and platform areas. No pop-ups: on small
//      screens the menu opens in the page, under the topbar, and pushes the content down.
// DEPENDS ON: Sidebar.tsx, Topbar.tsx, hooks/useMediaQuery.ts, React Router Outlet.

import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import type { MenuItem } from '@/components/ui/Dropdown';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/utils/cn';
import type { NavSection } from '@/utils/navigation';
import { Sidebar, SidebarNav } from './Sidebar';
import { Topbar, type TopbarUser } from './Topbar';

export function AppShell({
  sections,
  organizationName,
  user,
  menuItems,
  topbarActions,
  children,
}: {
  sections: NavSection[];
  organizationName?: string;
  user?: TopbarUser;
  menuItems?: MenuItem[];
  topbarActions?: ReactNode;
  children?: ReactNode;
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const showSidebar = isDesktop && !collapsed;
  const showMobileMenu = !isDesktop && menuOpen;

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        data-testid="skip-to-content-link"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      {showSidebar && (
        <Sidebar sections={sections} {...(organizationName ? { organizationName } : {})} />
      )}
      <div className={cn('flex min-h-screen flex-col', showSidebar && 'lg:pl-sidebar')}>
        <Topbar
          user={user}
          {...(menuItems ? { menuItems } : {})}
          {...(topbarActions ? { actions: topbarActions } : {})}
          menuExpanded={isDesktop ? showSidebar : menuOpen}
          onMenuClick={() => (isDesktop ? setCollapsed((c) => !c) : setMenuOpen((o) => !o))}
        />
        {showMobileMenu && (
          <div
            id="mobile-menu"
            className="border-b border-border bg-card px-3 py-3 shadow-sm"
            data-testid="nav-mobile-menu"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMenuOpen(false);
            }}
          >
            {organizationName && (
              <p className="mb-2 truncate px-3 text-xs text-muted">{organizationName}</p>
            )}
            <SidebarNav sections={sections} variant="light" onNavigate={() => setMenuOpen(false)} />
          </div>
        )}
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 focus:outline-none sm:p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
