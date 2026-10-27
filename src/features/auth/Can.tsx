// PURPOSE: <Can> shows its children only when the user holds the permission/role (UI gating, e.g. hide a button).
// WHY: One declarative component instead of if-statements with role names scattered over pages.
// DEPENDS ON: contexts/PermissionContext.tsx. The API still refuses forbidden calls.

import type { ReactNode } from 'react';
import { usePermissions } from '@/contexts/PermissionContext';
import type { PermissionCode, RoleCode } from '@/utils/permissions';

export function Can({
  permission,
  anyPermission,
  role,
  fallback = null,
  children,
}: {
  permission?: PermissionCode;
  anyPermission?: readonly PermissionCode[];
  role?: RoleCode;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const p = usePermissions();
  const allowed =
    (permission ? p.can(permission) : true) &&
    (anyPermission ? p.canAny(anyPermission) : true) &&
    (role ? p.hasRole(role) : true);
  return <>{allowed ? children : fallback}</>;
}
