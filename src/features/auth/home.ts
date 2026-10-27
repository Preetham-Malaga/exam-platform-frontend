// PURPOSE: Decides where a signed-in user lands, and which "return to" paths are safe.
// WHY: One place to change when later phases add the role dashboards; also blocks open-redirect tricks in ?from= values.
// DEPENDS ON: types/auth.ts.

import type { MeResponse } from '@/types/auth';

/** Landing page after sign-in: the role's dashboard, or /app when there is none (no role, platform admin). */
export function homePathFor(
  me: Pick<MeResponse, 'isPlatformAdmin' | 'roles' | 'organization' | 'permissions'> | null,
): string {
  if (!me?.organization) return '/app';
  const roles = me.roles;
  const reports = me.permissions.includes('report.read'); // both dashboards need it
  if (roles.includes('ORGANIZATION_OWNER') || roles.includes('ORGANIZATION_ADMIN'))
    return reports ? '/org/dashboard' : '/app';
  if (roles.includes('TEACHER')) return reports ? '/teacher/dashboard' : '/app';
  if (roles.includes('STUDENT')) return '/student/dashboard';
  return '/app';
}

/** Only same-site absolute paths are allowed (blocks "//evil.com" and "https://evil.com"). */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (value.startsWith('/login') || value.startsWith('/register')) return null;
  return value;
}
