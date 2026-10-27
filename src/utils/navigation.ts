// PURPOSE: Navigation definitions per area (organization, teacher, student, platform) with the permission each item needs.
// WHY: One config drives the sidebar; filterNavigation hides items the user cannot use. Hiding is UX only: routes AND the API enforce permissions.
// DEPENDS ON: components/ui/Icon.tsx (icon names). Used by layouts and the Sidebar.

import type { IconName } from '@/components/ui/Icon';
import type { PermissionCode } from './permissions';

export interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  /** The user needs at least one of these permissions to see the item. Omit = visible to everyone in the area. */
  anyPermission?: PermissionCode[];
  end?: boolean;
}
export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const orgNavigation: NavSection[] = [
  {
    items: [
      {
        label: 'Dashboard',
        to: '/org/dashboard',
        icon: 'dashboard',
        anyPermission: ['report.read'],
      },
    ],
  },
  {
    title: 'Content Management',
    items: [
      {
        label: 'Academic Structure',
        to: '/org/academic',
        icon: 'layers',
        anyPermission: ['academic.manage'],
      },
      { label: 'Courses', to: '/org/courses', icon: 'book', anyPermission: ['course.read'] },
      { label: 'Subjects', to: '/org/subjects', icon: 'list', anyPermission: ['subject.read'] },
      { label: 'Topics', to: '/org/topics', icon: 'list', anyPermission: ['topic.read'] },
      {
        label: 'Question Bank',
        to: '/org/questions',
        icon: 'help',
        anyPermission: ['question.read'],
      },
    ],
  },
  {
    title: 'Exam Management',
    items: [
      { label: 'Exams', to: '/org/exams', icon: 'file', anyPermission: ['exam.read'], end: true },
      {
        label: 'Published Exams',
        to: '/org/exams/published',
        icon: 'check',
        anyPermission: ['exam.read'],
      },
      {
        label: 'Assignments',
        to: '/org/assignments',
        icon: 'send',
        anyPermission: ['exam.assign'],
      },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Students', to: '/org/students', icon: 'users', anyPermission: ['student.read'] },
      { label: 'Teachers', to: '/org/teachers', icon: 'user', anyPermission: ['teacher.read'] },
      { label: 'Users', to: '/org/users', icon: 'shield', anyPermission: ['user.read'] },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Results', to: '/org/results', icon: 'chart', anyPermission: ['result.read'] },
      {
        label: 'Leaderboard',
        to: '/org/leaderboard',
        icon: 'trophy',
        anyPermission: ['leaderboard.read'],
      },
      { label: 'Reports', to: '/org/reports', icon: 'file', anyPermission: ['report.read'] },
    ],
  },
  {
    title: 'System',
    items: [
      {
        label: 'Notifications',
        to: '/org/notifications',
        icon: 'bell',
        anyPermission: ['notification.read'],
      },
      {
        label: 'Organization Profile',
        to: '/org/profile',
        icon: 'building',
        anyPermission: ['organization.read'],
      },
      {
        label: 'Roles & Permissions',
        to: '/org/settings/permissions',
        icon: 'shield',
        anyPermission: ['settings.read'],
      },
    ],
  },
];

export const teacherNavigation: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/teacher/dashboard', icon: 'dashboard' },
      {
        label: 'Subjects',
        to: '/teacher/subjects',
        icon: 'book',
        anyPermission: ['subject.read'],
      },
      { label: 'Topics', to: '/teacher/topics', icon: 'list', anyPermission: ['topic.read'] },
      {
        label: 'Question Bank',
        to: '/teacher/questions',
        icon: 'help',
        anyPermission: ['question.read'],
      },
      { label: 'Exams', to: '/teacher/exams', icon: 'file', anyPermission: ['exam.read'] },
      { label: 'Results', to: '/teacher/results', icon: 'chart', anyPermission: ['result.read'] },
    ],
  },
];

export const studentNavigation: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/student/dashboard', icon: 'dashboard' },
      { label: 'My Exams', to: '/student/exams', icon: 'file' },
      { label: 'Results', to: '/student/results', icon: 'chart' },
      {
        label: 'Leaderboard',
        to: '/student/leaderboard',
        icon: 'trophy',
        anyPermission: ['leaderboard.read'],
      },
    ],
  },
];

export const platformNavigation: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/platform/dashboard', icon: 'dashboard' },
      { label: 'Organizations', to: '/platform/organizations', icon: 'building' },
      { label: 'Users', to: '/platform/users', icon: 'users' },
      { label: 'Plans', to: '/platform/plans', icon: 'layers' },
      { label: 'Subscriptions', to: '/platform/subscriptions', icon: 'check' },
      { label: 'Audit Logs', to: '/platform/audit-logs', icon: 'shield' },
    ],
  },
];

/** Keeps only the items the user may use; drops sections that become empty. `can` answers "does the user hold this permission?". */
export function filterNavigation(
  sections: NavSection[],
  can: (permission: PermissionCode) => boolean,
): NavSection[] {
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.anyPermission || i.anyPermission.some(can)),
    }))
    .filter((s) => s.items.length > 0);
}

/** Which menu a signed-in user sees (platform staff, organization owners/admins, teachers, students). Filtering by permission happens on top. */
export function navigationFor(
  me: { isPlatformAdmin: boolean; roles: string[] } | null,
): NavSection[] {
  if (!me) return [];
  if (me.isPlatformAdmin) return platformNavigation;
  if (me.roles.includes('ORGANIZATION_OWNER') || me.roles.includes('ORGANIZATION_ADMIN'))
    return orgNavigation;
  if (me.roles.includes('TEACHER')) return teacherNavigation;
  if (me.roles.includes('STUDENT')) return studentNavigation;
  return [];
}
