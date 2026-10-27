// PURPOSE: The ONE place that knows permission codes and answers "may this user do X?" (pure functions, easy to test).
// WHY: Pages must never hard-code role names or permission logic. The list mirrors the backend/database seed.
//      This only shapes the UI; the API and PostgreSQL row level security enforce every rule.
// DEPENDS ON: Nothing. Used by PermissionContext, guards, navigation and pages.

export const PERMISSIONS = [
  'organization.read',
  'organization.update',
  'user.read',
  'user.create',
  'user.update',
  'user.delete',
  'student.read',
  'student.create',
  'student.update',
  'student.delete',
  'student.import',
  'teacher.read',
  'teacher.create',
  'teacher.update',
  'teacher.delete',
  'teacher.assign_scope',
  'academic.manage',
  'course.read',
  'course.create',
  'course.update',
  'course.delete',
  'subject.read',
  'subject.create',
  'subject.update',
  'subject.delete',
  'topic.read',
  'topic.create',
  'topic.update',
  'topic.delete',
  'question.create',
  'question.read',
  'question.update',
  'question.delete',
  'question.publish',
  'exam.read',
  'exam.create',
  'exam.update',
  'exam.delete',
  'exam.assign',
  'exam.publish',
  'exam.unpublish',
  'result.read',
  'report.read',
  'leaderboard.read',
  'settings.read',
  'settings.update',
  'subscription.read',
  'notification.read',
  'audit.read',
] as const;
export type PermissionCode = (typeof PERMISSIONS)[number];

export const ROLES = {
  OWNER: 'ORGANIZATION_OWNER',
  ADMIN: 'ORGANIZATION_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;
export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABEL: Record<string, string> = {
  ORGANIZATION_OWNER: 'Owner',
  ORGANIZATION_ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

export interface Caller {
  permissions: readonly string[];
  roles: readonly string[];
  isPlatformAdmin?: boolean;
}

export const can = (caller: Caller | null | undefined, permission: PermissionCode): boolean =>
  Boolean(caller?.permissions.includes(permission));
export const canAny = (
  caller: Caller | null | undefined,
  permissions: readonly PermissionCode[],
): boolean => permissions.some((p) => can(caller, p));
export const canAll = (
  caller: Caller | null | undefined,
  permissions: readonly PermissionCode[],
): boolean => permissions.every((p) => can(caller, p));
export const hasRole = (caller: Caller | null | undefined, role: RoleCode): boolean =>
  Boolean(caller?.roles.includes(role));
export const isOwner = (caller: Caller | null | undefined): boolean => hasRole(caller, ROLES.OWNER);
export const isOrgAdmin = (caller: Caller | null | undefined): boolean =>
  hasRole(caller, ROLES.OWNER) || hasRole(caller, ROLES.ADMIN);

/** Which roles `actor` may assign to someone else (mirrors the database rule: only the owner assigns Admin). */
export function assignableRoles(actor: Caller | null | undefined): RoleCode[] {
  if (!can(actor, 'user.update')) return [];
  return isOwner(actor)
    ? [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT]
    : [ROLES.TEACHER, ROLES.STUDENT];
}

/** May `actor` change the role/status of `target`? Never yourself, never the owner; only the owner may touch admins. */
export function canManageUser(
  actor: Caller | null | undefined,
  actorId: string | undefined,
  target: { userId: string; roles: readonly string[] },
): boolean {
  if (!can(actor, 'user.update') || target.userId === actorId) return false;
  if (target.roles.includes(ROLES.OWNER)) return false;
  if (target.roles.includes(ROLES.ADMIN) && !isOwner(actor)) return false;
  return true;
}

/** Groups codes by resource ("user.update" -> group "user") for the permission matrix. */
export function groupPermissions(
  codes: readonly string[],
): Array<{ resource: string; actions: string[] }> {
  const map = new Map<string, string[]>();
  for (const c of codes) {
    const [resource = c, action = ''] = c.split('.');
    map.set(resource, [...(map.get(resource) ?? []), action]);
  }
  return [...map.entries()].map(([resource, actions]) => ({ resource, actions }));
}
