// PURPOSE: Frame for all /org/* pages (sidebar card). Phase 6 will filter the menu by the user's permissions.
// WHY: One place decides which navigation the organization area shows.
// DEPENDS ON: components/layout/AppShell.tsx, utils/navigation.ts.

import { AppShell } from '@/components/layout/AppShell';
import { orgNavigation } from '@/utils/navigation';

export default function OrgLayout() {
  return <AppShell sections={orgNavigation} />;
}
