// PURPOSE: Navigation definitions per area (organization, teacher, student, platform) with the permission each item needs.
// WHY: One config drives the sidebar; filterNavigation hides items the user cannot use. Hiding is UX only: routes AND the API enforce permissions.
// DEPENDS ON: components/ui/Icon.tsx (icon names). Used by layouts and the Sidebar.

import type { IconName } from '@/components/ui/Icon';
import type { PermissionCode } from './permissions';

export interface NavItem {
  /** Prototype menu id: the link's locator is nav-<key>-link (e.g. "syllabus" for Courses, "org-profile"). */
  key: string;
  label: string;
  to: string;
  icon: IconName;
  /** The user needs at least one of these permissions to see the item. Omit = visible to everyone in the area. */
  anyPermission?: PermissionCode[];
  end?: boolean;
}
export interface NavSection {
  /** Group id from the prototype NAV (overview, academics, people …): its button is nav-<id>-group-btn. */
  id?: string;
  /** Sections with a title are collapsible groups; the group holding the current page is always open. */
  title?: string;
  items: NavItem[];
}

// Matches the prototype NAV (docs/design/exam-platform-prototype.html). Groups and items for screens that are not built
// yet (Learning, Batches) are added in their step of docs/design/IMPLEMENTATION_PLAN.md.
export const orgNavigation: NavSection[] = [
  {
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        to: '/org/dashboard',
        icon: 'dashboard',
        anyPermission: ['report.read'],
      },
    ],
  },
  {
    id: 'academics',
    title: 'Academics',
    items: [
      {
        key: 'syllabus',
        label: 'Courses',
        to: '/org/courses',
        icon: 'tree',
        anyPermission: ['course.read', 'subject.read'],
      },
      {
        key: 'questions',
        label: 'Question Bank',
        to: '/org/questions',
        icon: 'help',
        anyPermission: ['question.read'],
      },
    ],
  },
  {
    id: 'assessments',
    title: 'Assessments',
    items: [
      {
        key: 'exams',
        label: 'Exams',
        to: '/org/exams',
        icon: 'file',
        anyPermission: ['exam.read'],
      },
    ],
  },
  {
    id: 'people',
    title: 'People',
    items: [
      {
        key: 'students',
        label: 'Students',
        to: '/org/students',
        icon: 'users',
        anyPermission: ['student.read'],
      },
      {
        key: 'teachers',
        label: 'Teachers',
        to: '/org/teachers',
        icon: 'user',
        anyPermission: ['teacher.read'],
      },
      {
        key: 'batches',
        label: 'Batches',
        to: '/org/batches',
        icon: 'layers',
        anyPermission: ['student.read'],
      },
      {
        key: 'admins',
        label: 'Admins',
        to: '/org/admins',
        icon: 'shield',
        anyPermission: ['user.read'],
      },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    items: [
      {
        key: 'results',
        label: 'Results',
        to: '/org/results',
        icon: 'chart',
        anyPermission: ['result.read'],
      },
      {
        key: 'leaderboard',
        label: 'Leaderboard',
        to: '/org/leaderboard',
        icon: 'trophy',
        anyPermission: ['leaderboard.read'],
      },
      {
        key: 'reports',
        label: 'Reports',
        to: '/org/reports',
        icon: 'file',
        anyPermission: ['report.read'],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    items: [
      {
        key: 'org-profile',
        label: 'Organization Profile',
        to: '/org/profile',
        icon: 'building',
        anyPermission: ['organization.read'],
      },
      {
        key: 'roles',
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
    items: [{ key: 'dashboard', label: 'Dashboard', to: '/teacher/dashboard', icon: 'dashboard' }],
  },
  {
    id: 'academics',
    title: 'Academics',
    items: [
      {
        key: 'syllabus',
        label: 'Courses',
        to: '/teacher/courses',
        icon: 'tree',
        anyPermission: ['subject.read'],
      },
      {
        key: 'questions',
        label: 'Question Bank',
        to: '/teacher/questions',
        icon: 'help',
        anyPermission: ['question.read'],
      },
    ],
  },
  {
    id: 'assessments',
    title: 'Assessments',
    items: [
      {
        key: 'exams',
        label: 'Exams',
        to: '/teacher/exams',
        icon: 'file',
        anyPermission: ['exam.read'],
      },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    items: [
      {
        key: 'results',
        label: 'Results',
        to: '/teacher/results',
        icon: 'chart',
        anyPermission: ['result.read'],
      },
    ],
  },
];

export const studentNavigation: NavSection[] = [
  {
    items: [{ key: 'home', label: 'Home', to: '/student/dashboard', icon: 'home' }],
  },
  {
    id: 'my-exams',
    title: 'My exams',
    items: [
      { key: 'my-exams', label: 'My Exams', to: '/student/exams', icon: 'file' },
      { key: 'my-results', label: 'My Results', to: '/student/results', icon: 'chart' },
      {
        key: 'leaderboard',
        label: 'Leaderboard',
        to: '/student/leaderboard',
        icon: 'trophy',
        anyPermission: ['leaderboard.read'],
      },
    ],
  },
];

// Platform staff. Only screens that exist are listed; more come with their own screens.
export const platformNavigation: NavSection[] = [
  {
    items: [
      {
        key: 'organizations',
        label: 'Organizations',
        to: '/platform/organizations',
        icon: 'building',
      },
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
