// Locators for the signed-in frame (sidebar card, grouped menu, page header). Same names as docs/locators.md → "App shell".
import { tid } from './tid';

export const AppShell = {
  sidebar: tid('sidebar'),
  nav: tid('nav'),
  /** Below 860 px: opens and closes the menu inside the sidebar card. */
  menuBtn: tid('nav-menu-btn'),
  logoutBtn: tid('nav-logout-btn'),
  sidebarUserName: tid('sidebar-user-name'),
  pageHeader: tid('page-header'),
  userPill: tid('header-user-pill'),
  userName: tid('header-user-name'),
  userEmail: tid('header-user-email'),
  skipToContentLink: tid('skip-to-content-link'),
  breadcrumb: tid('breadcrumb'),
  breadcrumbLink: tid('breadcrumb-link'),
  accessDenied: tid('access-denied'),
  accessDeniedHomeLink: tid('access-denied-home-link'),
  accountLoadError: tid('account-load-error'),
  accountLoadErrorRetryBtn: tid('account-load-error-retry-btn'),
  accountLoadErrorSignOutBtn: tid('account-load-error-signout-btn'),
} as const;

/** Menu groups (prototype NAV): nav-<group>-group-btn, aria-expanded; the current page's group is always open. */
export const NavGroups = {
  overview: tid('nav-overview-group-btn'),
  academics: tid('nav-academics-group-btn'),
  assessments: tid('nav-assessments-group-btn'),
  people: tid('nav-people-group-btn'),
  insights: tid('nav-insights-group-btn'),
  settings: tid('nav-settings-group-btn'),
  myExams: tid('nav-my-exams-group-btn'),
} as const;

/** Menu links: nav-<key>-link with the prototype's keys (Courses is "syllabus"). */
export const NavLinks = {
  dashboard: tid('nav-dashboard-link'),
  courses: tid('nav-syllabus-link'),
  subjects: tid('nav-subjects-link'),
  topics: tid('nav-topics-link'),
  questions: tid('nav-questions-link'),
  exams: tid('nav-exams-link'),
  students: tid('nav-students-link'),
  teachers: tid('nav-teachers-link'),
  admins: tid('nav-admins-link'),
  results: tid('nav-results-link'),
  leaderboard: tid('nav-leaderboard-link'),
  reports: tid('nav-reports-link'),
  orgProfile: tid('nav-org-profile-link'),
  roles: tid('nav-roles-link'),
  home: tid('nav-home-link'),
  myExams: tid('nav-my-exams-link'),
  myResults: tid('nav-my-results-link'),
} as const;
