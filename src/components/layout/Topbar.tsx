// PURPOSE: White top navigation bar: menu toggle on the left, actions and the user menu on the right.
// WHY: Gives every authenticated page the same header; the user menu is where "Sign out" will live (Phase 5).
// DEPENDS ON: ui/Avatar.tsx, Dropdown.tsx, Button.tsx, Icon.tsx.

import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Dropdown, type MenuItem } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';

export interface TopbarUser {
  name: string;
  email?: string;
}

export function Topbar({
  onMenuClick,
  user,
  menuItems = [],
  actions,
  menuExpanded,
}: {
  onMenuClick: () => void;
  user?: TopbarUser | undefined;
  menuItems?: MenuItem[];
  actions?: ReactNode;
  /** Whether the navigation (sidebar or mobile menu) is showing. */
  menuExpanded?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between gap-3 border-b border-border bg-card px-4">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Toggle navigation"
        aria-expanded={menuExpanded}
        data-testid="topbar-nav-toggle-btn"
        data-expanded={menuExpanded}
        onClick={onMenuClick}
      >
        <Icon name="menu" size={20} />
      </Button>
      <div className="flex items-center gap-3">
        {actions}
        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p
                className="text-[13px] font-medium leading-tight text-text"
                data-testid="topbar-user-name"
              >
                {user.name}
              </p>
              {user.email && (
                <p className="text-xs leading-tight text-muted" data-testid="topbar-user-email">
                  {user.email}
                </p>
              )}
            </div>
            {menuItems.length > 0 ? (
              <Dropdown
                label="Account menu"
                testId="topbar-account"
                trigger={<Avatar name={user.name} />}
                items={menuItems}
              />
            ) : (
              <Avatar name={user.name} />
            )}
          </div>
        )}
      </div>
    </header>
  );
}
