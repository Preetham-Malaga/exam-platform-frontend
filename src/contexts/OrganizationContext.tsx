// PURPOSE: Gives components the CURRENT organization (id, code, name, status) taken from the server's /me answer.
// WHY: The organization always comes from the server (membership), never from the URL or local state.
// DEPENDS ON: AuthContext. Mounted in app/providers.tsx.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { MeOrganization } from '@/types/auth';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext<{ organization: MeOrganization | null } | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const value = useMemo(() => ({ organization: me?.organization ?? null }), [me]);
  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to its provider on purpose
export function useCurrentOrganization(): MeOrganization | null {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useCurrentOrganization must be used inside <OrganizationProvider>');
  return ctx.organization;
}
