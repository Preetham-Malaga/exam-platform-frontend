// PURPOSE: Gives every component the signed-in user's roles and permission checks (can / canAny / hasRole ...).
// WHY: Components ask "can I?" through one hook instead of reading roles themselves.
// DEPENDS ON: AuthContext (the /me response), utils/permissions.ts. Mounted in app/providers.tsx.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  assignableRoles,
  can,
  canAll,
  canAny,
  hasRole,
  isOrgAdmin,
  isOwner,
  type Caller,
  type PermissionCode,
  type RoleCode,
} from '@/utils/permissions';

export interface PermissionContextValue {
  roles: readonly string[];
  permissions: readonly string[];
  isPlatformAdmin: boolean;
  can: (permission: PermissionCode) => boolean;
  canAny: (permissions: readonly PermissionCode[]) => boolean;
  canAll: (permissions: readonly PermissionCode[]) => boolean;
  hasRole: (role: RoleCode) => boolean;
  isOwner: boolean;
  isOrgAdmin: boolean;
  assignableRoles: RoleCode[];
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const value = useMemo<PermissionContextValue>(() => {
    const caller: Caller = {
      permissions: me?.permissions ?? [],
      roles: me?.roles ?? [],
      isPlatformAdmin: me?.isPlatformAdmin ?? false,
    };
    return {
      roles: caller.roles,
      permissions: caller.permissions,
      isPlatformAdmin: Boolean(caller.isPlatformAdmin),
      can: (p) => can(caller, p),
      canAny: (ps) => canAny(caller, ps),
      canAll: (ps) => canAll(caller, ps),
      hasRole: (r) => hasRole(caller, r),
      isOwner: isOwner(caller),
      isOrgAdmin: isOrgAdmin(caller),
      assignableRoles: assignableRoles(caller),
    };
  }, [me]);
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to its provider on purpose
export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used inside <PermissionProvider>');
  return ctx;
}
