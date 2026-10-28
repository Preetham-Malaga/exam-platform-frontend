// PURPOSE: The authenticated page frame: 236px sidebar (desktop, collapsible), drawer navigation (tablet/mobile), topbar, content.
// WHY: One responsive shell for organization, teacher, student-dashboard and platform areas.
// DEPENDS ON: Sidebar.tsx, Topbar.tsx, Dialog.tsx (Drawer), hooks/useMediaQuery.ts, React Router Outlet.

import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Drawer } from '@/components/modals/Dialog';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showSidebar = isDesktop && !collapsed;

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
      {!isDesktop && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Navigation"
          side="left"
          testId="nav-drawer"
        >
          <SidebarNav sections={sections} variant="light" onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}
      <div className={cn('flex min-h-screen flex-col', showSidebar && 'lg:pl-sidebar')}>
        <Topbar
          user={user}
          {...(menuItems ? { menuItems } : {})}
          {...(topbarActions ? { actions: topbarActions } : {})}
          onMenuClick={() => (isDesktop ? setCollapsed((c) => !c) : setDrawerOpen(true))}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 focus:outline-none sm:p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
