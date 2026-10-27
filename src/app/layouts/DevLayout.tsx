// PURPOSE: Frame for the developer-only UI gallery (uses the organization navigation so you can see the real shell).
// WHY: Lets you review the sidebar/topbar/responsive behaviour without logging in.
// DEPENDS ON: components/layout/AppShell.tsx.

import { AppShell } from '@/components/layout/AppShell';
import { orgNavigation } from '@/utils/navigation';

export default function DevLayout() {
  return (
    <AppShell
      sections={orgNavigation}
      organizationName="Demo Institute"
      user={{ name: 'Dev User', email: 'dev@example.com' }}
    />
  );
}
