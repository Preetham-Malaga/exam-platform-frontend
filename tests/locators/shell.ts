// Locators for the signed-in frame (sidebar, mobile menu, topbar, account menu). Same names as docs/locators.md → "App shell".
import { tid } from './tid';

export const AppShell = {
  nav: tid('nav'),
  /** Small screens: the menu opens in the page under the topbar (no drawer). */
  navMobileMenu: tid('nav-mobile-menu'),
  navToggleBtn: tid('topbar-nav-toggle-btn'),
  userName: tid('topbar-user-name'),
  userEmail: tid('topbar-user-email'),
  accountMenuBtn: tid('topbar-account-menu-btn'),
  accountMenu: tid('topbar-account-menu'),
  signOutMenuItem: tid('topbar-account-signout-menu-item'),
  skipToContentLink: tid('skip-to-content-link'),
  breadcrumb: tid('breadcrumb'),
  breadcrumbLink: tid('breadcrumb-link'),
  accessDenied: tid('access-denied'),
  accessDeniedHomeLink: tid('access-denied-home-link'),
  accountLoadError: tid('account-load-error'),
  accountLoadErrorRetryBtn: tid('account-load-error-retry-btn'),
  accountLoadErrorSignOutBtn: tid('account-load-error-signout-btn'),
} as const;

/** Organization menu groups (collapsible): nav-<group>-group-btn has aria-expanded / data-expanded. */
export const NavGroups = {
  syllabus: tid('nav-syllabus-group-btn'),
  exams: tid('nav-exams-group-btn'),
  people: tid('nav-people-group-btn'),
  insights: tid('nav-insights-group-btn'),
  settings: tid('nav-settings-group-btn'),
} as const;

/** Sidebar links: nav-<group>-<page>-link (route without the area; a leading group name is not repeated). */
export const NavLinks = {
  dashboard: tid('nav-dashboard-link'),
  courses: tid('nav-syllabus-courses-link'),
  subjects: tid('nav-syllabus-subjects-link'),
  topics: tid('nav-syllabus-topics-link'),
  questions: tid('nav-syllabus-questions-link'),
  exams: tid('nav-exams-exams-link'),
  publishedExams: tid('nav-exams-published-link'),
  assignments: tid('nav-exams-assignments-link'),
  students: tid('nav-people-students-link'),
  teachers: tid('nav-people-teachers-link'),
  users: tid('nav-people-users-link'),
  results: tid('nav-insights-results-link'),
  leaderboard: tid('nav-insights-leaderboard-link'),
  reports: tid('nav-insights-reports-link'),
  notifications: tid('nav-settings-notifications-link'),
  profile: tid('nav-settings-profile-link'),
  permissions: tid('nav-settings-permissions-link'),
} as const;
