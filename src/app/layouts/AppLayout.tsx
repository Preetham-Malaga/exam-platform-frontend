// PURPOSE: Frame for every signed-in page: sidebar menu for the user's area, topbar with the account menu and Sign out.
// WHY: One layout reads the signed-in user (AuthContext); Phase 6 will additionally filter the menu by permission.
// DEPENDS ON: contexts/AuthContext.tsx, components/layout/AppShell.tsx, utils/navigation.ts.

import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { filterNavigation, navigationFor } from '@/utils/navigation';

export default function AppLayout() {
  const { me, signOut } = useAuth();
  const { can } = usePermissions();
  const name = me?.user.fullName || me?.user.email || 'Account';
  return (
    <AppShell
      sections={filterNavigation(navigationFor(me), can)}
      {...(me?.organization ? { organizationName: me.organization.name } : {})}
      user={{ name, email: me?.user.email ?? '' }}
      menuItems={[{ label: 'Sign out', onSelect: () => void signOut() }]}
    />
  );
}
