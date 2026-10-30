// PURPOSE: Frame for every signed-in page: the prototype sidebar card with the user's menu, and Log out in its footer.
// WHY: One layout reads the signed-in user (AuthContext) and filters the menu by permission (UX only; the API decides).
// DEPENDS ON: contexts/AuthContext.tsx, components/layout/AppShell.tsx, utils/navigation.ts.

import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { applyOrgBrand } from '@/features/appearance/appearance';
import { setDatePreferences } from '@/utils/dates';
import { filterNavigation, navigationFor } from '@/utils/navigation';
import { ROLE_LABEL } from '@/utils/permissions';

export default function AppLayout() {
  const { me, signOut } = useAuth();
  const { can } = usePermissions();
  // The organization's theme and date / time format apply to everyone in it (they come with the account).
  const b = me?.preferences;
  // Date formats are read while rendering, so they are set before the pages below render.
  if (b)
    setDatePreferences({
      ...(b.dateFormat ? { dateFormat: b.dateFormat } : {}),
      ...(b.timeFormat ? { timeFormat: b.timeFormat } : {}),
    });
  useEffect(() => applyOrgBrand(b?.theme ?? undefined), [b?.theme]);
  const name = me?.user.fullName || me?.user.email || 'Account';
  const role = me?.isPlatformAdmin
    ? 'Platform admin'
    : me?.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ') || undefined;
  return (
    <AppShell
      sections={filterNavigation(navigationFor(me), can)}
      {...(me?.organization ? { organizationName: me.organization.name } : {})}
      user={{ name, email: me?.user.email ?? '', ...(role ? { role } : {}) }}
      onSignOut={() => void signOut()}
    />
  );
}
