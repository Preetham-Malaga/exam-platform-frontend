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

/** Sidebar links: the id comes from the route with the area prefix dropped (/org/exams/published → nav-exams-published-link). */
export const NavLinks = {
  dashboard: tid('nav-dashboard-link'),
  academic: tid('nav-academic-link'),
  courses: tid('nav-courses-link'),
  subjects: tid('nav-subjects-link'),
  topics: tid('nav-topics-link'),
  questions: tid('nav-questions-link'),
  exams: tid('nav-exams-link'),
  publishedExams: tid('nav-exams-published-link'),
  assignments: tid('nav-assignments-link'),
  students: tid('nav-students-link'),
  teachers: tid('nav-teachers-link'),
  users: tid('nav-users-link'),
  results: tid('nav-results-link'),
  leaderboard: tid('nav-leaderboard-link'),
  reports: tid('nav-reports-link'),
  notifications: tid('nav-notifications-link'),
  profile: tid('nav-profile-link'),
  permissions: tid('nav-settings-permissions-link'),
} as const;
