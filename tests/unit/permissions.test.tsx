import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Can } from '@/features/auth/Can';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { AuthContextForTests } from '../helpers/authContext';
import { PERMS } from '../helpers/app';
import {
  filterNavigation,
  navigationFor,
  orgNavigation,
  platformNavigation,
  studentNavigation,
  teacherNavigation,
} from '@/utils/navigation';
import {
  PERMISSIONS,
  assignableRoles,
  can,
  canAll,
  canAny,
  canManageUser,
  groupPermissions,
  hasRole,
  isOrgAdmin,
  isOwner,
} from '@/utils/permissions';

const owner = { permissions: PERMS.OWNER, roles: ['ORGANIZATION_OWNER'] };
const admin = { permissions: PERMS.ADMIN, roles: ['ORGANIZATION_ADMIN'] };
const teacher = { permissions: PERMS.TEACHER, roles: ['TEACHER'] };
const student = { permissions: PERMS.STUDENT, roles: ['STUDENT'] };

describe('permission helpers (pure)', () => {
  it('can / canAny / canAll treat missing callers as having nothing', () => {
    expect(can(null, 'user.read')).toBe(false);
    expect(can(undefined, 'user.read')).toBe(false);
    expect(can(student, 'leaderboard.read')).toBe(true);
    expect(can(student, 'exam.create')).toBe(false);
    expect(canAny(student, ['exam.create', 'leaderboard.read'])).toBe(true);
    expect(canAny(student, [])).toBe(false);
    expect(canAll(teacher, ['question.create', 'question.publish'])).toBe(true);
    expect(canAll(teacher, ['question.create', 'user.update'])).toBe(false);
    expect(canAll(student, [])).toBe(true);
  });
  it('role helpers', () => {
    expect(isOwner(owner)).toBe(true);
    expect(isOwner(admin)).toBe(false);
    expect(isOrgAdmin(owner)).toBe(true);
    expect(isOrgAdmin(admin)).toBe(true);
    expect(isOrgAdmin(teacher)).toBe(false);
    expect(hasRole(teacher, 'TEACHER' as never)).toBe(true);
    expect(isOwner(null)).toBe(false);
  });
  it('which roles each caller may assign (only the owner assigns Admin)', () => {
    expect(assignableRoles(owner)).toEqual(['ORGANIZATION_ADMIN', 'TEACHER', 'STUDENT']);
    expect(assignableRoles(admin)).toEqual(['TEACHER', 'STUDENT']);
    expect(assignableRoles(teacher)).toEqual([]);
    expect(assignableRoles(student)).toEqual([]);
    expect(assignableRoles(null)).toEqual([]);
  });
  it('who may manage whom: never yourself, never the owner, only the owner may touch admins', () => {
    const target = (userId: string, role: string) => ({ userId, roles: [role] });
    expect(canManageUser(owner, 'me', target('x', 'TEACHER'))).toBe(true);
    expect(canManageUser(owner, 'me', target('x', 'ORGANIZATION_ADMIN'))).toBe(true);
    expect(canManageUser(owner, 'me', target('me', 'ORGANIZATION_OWNER'))).toBe(false);
    expect(canManageUser(owner, 'me', target('x', 'ORGANIZATION_OWNER'))).toBe(false);
    expect(canManageUser(admin, 'me', target('x', 'STUDENT'))).toBe(true);
    expect(canManageUser(admin, 'me', target('x', 'ORGANIZATION_ADMIN'))).toBe(false);
    expect(canManageUser(admin, 'me', target('x', 'ORGANIZATION_OWNER'))).toBe(false);
    expect(canManageUser(teacher, 'me', target('x', 'STUDENT'))).toBe(false);
    expect(canManageUser(student, 'me', target('x', 'STUDENT'))).toBe(false);
  });
  it('permission codes are unique and grouped by resource', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    const groups = groupPermissions(['user.read', 'user.update', 'exam.read']);
    expect(groups).toEqual([
      { resource: 'user', actions: ['read', 'update'] },
      { resource: 'exam', actions: ['read'] },
    ]);
  });
});

describe('navigation', () => {
  const labels = (sections: ReturnType<typeof filterNavigation>) =>
    sections.flatMap((s) => s.items.map((i) => i.label));
  it('every permission mentioned by a menu item is a real permission code', () => {
    for (const nav of [orgNavigation, teacherNavigation, studentNavigation, platformNavigation]) {
      for (const item of nav.flatMap((s) => s.items))
        for (const p of item.anyPermission ?? [])
          expect(PERMISSIONS, `${item.label}: ${p}`).toContain(p);
    }
  });
  it('picks the menu by role and filters it by permission', () => {
    const asMe = (x: typeof owner) => ({ isPlatformAdmin: false, roles: x.roles });
    expect(labels(filterNavigation(navigationFor(asMe(owner)), (p) => can(owner, p)))).toContain(
      'Users',
    );
    expect(labels(filterNavigation(navigationFor(asMe(admin)), (p) => can(admin, p)))).toContain(
      'Users',
    );
    expect(labels(filterNavigation(navigationFor(asMe(teacher)), (p) => can(teacher, p)))).toEqual([
      'Dashboard',
      'Subjects',
      'Topics',
      'Question Bank',
      'Exams',
      'Results',
    ]);
    expect(labels(filterNavigation(navigationFor(asMe(student)), (p) => can(student, p)))).toEqual([
      'Dashboard',
      'My Exams',
      'Results',
      'Leaderboard',
    ]);
    expect(navigationFor({ isPlatformAdmin: true, roles: ['ORGANIZATION_OWNER'] })).toBe(
      platformNavigation,
    ); // platform staff are not organization owners
    expect(navigationFor({ isPlatformAdmin: false, roles: [] })).toEqual([]);
    expect(navigationFor(null)).toEqual([]);
  });
  it('a user with a limited permission set sees only those items', () => {
    const only = (p: string) => ['course.read', 'subject.read'].includes(p);
    expect(labels(filterNavigation(orgNavigation, only as never))).toEqual(['Courses', 'Subjects']);
  });
});

describe('<Can>', () => {
  const renderWith = (me: unknown, ui: React.ReactNode) =>
    render(
      <AuthContextForTests me={me as never}>
        <PermissionProvider>{ui}</PermissionProvider>
      </AuthContextForTests>,
    );
  it('shows children only when the permission is held, otherwise the fallback', () => {
    renderWith(
      { permissions: PERMS.TEACHER, roles: ['TEACHER'], isPlatformAdmin: false },
      <>
        <Can permission="question.create">
          <span>create-ok</span>
        </Can>
        <Can permission="user.update" fallback={<span>no-users</span>}>
          users-ok
        </Can>
        <Can anyPermission={['user.update', 'exam.read']}>
          <span>any-ok</span>
        </Can>
        <Can role="ORGANIZATION_OWNER">
          <span>owner-only</span>
        </Can>
      </>,
    );
    expect(screen.getByText('create-ok')).toBeInTheDocument();
    expect(screen.getByText('no-users')).toBeInTheDocument();
    expect(screen.getByText('any-ok')).toBeInTheDocument();
    expect(screen.queryByText('owner-only')).not.toBeInTheDocument();
    expect(screen.queryByText('users-ok')).not.toBeInTheDocument();
  });
  it('a signed-out visitor holds nothing', () => {
    renderWith(
      null,
      <Can permission="leaderboard.read" fallback="denied">
        visible
      </Can>,
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
  });
});
