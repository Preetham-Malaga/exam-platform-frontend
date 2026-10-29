// PURPOSE: Declares the route table with lazy-loaded pages (code splitting) and the auth guards.
// WHY: Public auth pages, guest-only pages and protected pages are separated here; each phase adds its routes.
// DEPENDS ON: pages/*, app/layouts/*, features/auth/guards.tsx.

import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { ToCourses } from '@/features/academic/ToCourses';
import { GuestOnly, RequirePermission, RequireAuth } from '@/features/auth/guards';

const page = (load: () => Promise<{ default: React.ComponentType }>) => ({
  lazy: async () => ({ Component: (await load()).default }),
});

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui',
        ...page(() => import('@/app/layouts/DevLayout')),
        children: [{ index: true, ...page(() => import('@/pages/dev/UiGallery')) }],
      },
    ]
  : [];

/** Courses tree and its add/edit pages: mounted under /org (owners, admins) and /teacher (RLS narrows a teacher's view). */
const catalogRoutes: RouteObject[] = [
  {
    element: <RequirePermission permission="subject.read" />,
    children: [
      { path: 'courses', ...page(() => import('@/pages/academic/CoursesPage')) },
      { path: 'subjects', element: <ToCourses /> },
      { path: 'topics', element: <ToCourses /> },
    ],
  },
  {
    element: <RequirePermission permission="course.create" />,
    children: [{ path: 'courses/new', ...page(() => import('@/pages/academic/CourseFormPage')) }],
  },
  {
    element: <RequirePermission permission="course.update" />,
    children: [
      { path: 'courses/:courseId/edit', ...page(() => import('@/pages/academic/CourseFormPage')) },
    ],
  },
  {
    element: <RequirePermission permission="subject.create" />,
    children: [
      {
        path: 'courses/:courseId/subjects/new',
        ...page(() => import('@/pages/academic/SubjectFormPage')),
      },
    ],
  },
  {
    element: <RequirePermission permission="subject.update" />,
    children: [
      {
        path: 'subjects/:subjectId/edit',
        ...page(() => import('@/pages/academic/SubjectFormPage')),
      },
    ],
  },
  {
    element: <RequirePermission permission="topic.create" />,
    children: [
      {
        path: 'subjects/:subjectId/topics/new',
        ...page(() => import('@/pages/academic/TopicFormPage')),
      },
    ],
  },
  {
    element: <RequirePermission permission="topic.update" />,
    children: [
      { path: 'topics/:topicId/edit', ...page(() => import('@/pages/academic/TopicFormPage')) },
    ],
  },
];

/** Dashboard, question bank, exams and results: mounted under /org and /teacher (RLS narrows what teachers see). */
const assessmentRoutes: RouteObject[] = [
  {
    element: <RequirePermission permission="report.read" />,
    children: [{ path: 'dashboard', ...page(() => import('@/pages/insights/DashboardPage')) }],
  },
  {
    element: <RequirePermission permission="question.read" />,
    children: [{ path: 'questions', ...page(() => import('@/pages/questions/QuestionBankPage')) }],
  },
  {
    element: <RequirePermission permission="exam.read" />,
    children: [
      { path: 'exams', ...page(() => import('@/pages/exams/ExamsPage')) },
      { path: 'exams/published', ...page(() => import('@/pages/exams/PublishedExamsPage')) },
      { path: 'exams/:examId', ...page(() => import('@/pages/exams/ExamDetailPage')) },
    ],
  },
  {
    element: <RequirePermission permission="result.read" />,
    children: [{ path: 'results', ...page(() => import('@/pages/insights/ResultsPage')) }],
  },
];

/** The student area. The API returns only the student's own exams and results. */
const studentRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="/student/dashboard" replace /> },
  { path: 'dashboard', ...page(() => import('@/pages/student/StudentDashboardPage')) },
  { path: 'exams', ...page(() => import('@/pages/student/StudentExamsPage')) },
  { path: 'attempts/:attemptId', ...page(() => import('@/pages/student/ExamRunnerPage')) },
  { path: 'results', ...page(() => import('@/pages/student/StudentResultsPage')) },
  { path: 'results/:attemptId', ...page(() => import('@/pages/student/ResultReviewPage')) },
  {
    element: <RequirePermission permission="leaderboard.read" />,
    children: [{ path: 'leaderboard', ...page(() => import('@/pages/insights/LeaderboardPage')) }],
  },
];

export const routes: RouteObject[] = [
  // No landing page: visitors go to sign in, and GuestOnly sends signed-in users on to their dashboard.
  { path: '/', element: <Navigate to="/login" replace /> },
  ...devRoutes,
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', ...page(() => import('@/pages/auth/LoginPage')) },
      { path: '/register', ...page(() => import('@/pages/auth/RegisterPage')) },
      { path: '/forgot-password', ...page(() => import('@/pages/auth/ForgotPasswordPage')) },
    ],
  },
  { path: '/register/pending', ...page(() => import('@/pages/auth/SignupPendingPage')) },
  // Reachable signed in or out: the e-mail links sign the user in first.
  { path: '/verify-email', ...page(() => import('@/pages/auth/VerifyEmailPage')) },
  { path: '/reset-password', ...page(() => import('@/pages/auth/ResetPasswordPage')) },
  {
    element: <RequireAuth />,
    children: [
      {
        ...page(() => import('@/app/layouts/AppLayout')),
        children: [
          { path: '/app', ...page(() => import('@/pages/app/AppHomePage')) },
          {
            path: '/platform/organizations',
            ...page(() => import('@/pages/platform/PlatformOrganizationsPage')),
          },
          {
            path: '/org',
            children: [
              { index: true, element: <Navigate to="/org/profile" replace /> },
              {
                element: <RequirePermission permission="organization.read" />,
                children: [
                  {
                    path: 'profile',
                    ...page(() => import('@/pages/organization/OrganizationProfilePage')),
                  },
                ],
              },
              {
                element: <RequirePermission permission="user.read" />,
                children: [
                  { path: 'users', ...page(() => import('@/pages/organization/UsersPage')) },
                  { path: 'admins', ...page(() => import('@/pages/organization/AdminsPage')) },
                ],
              },
              { path: 'academic', element: <ToCourses /> },
              ...catalogRoutes,
              ...assessmentRoutes,
              {
                element: <RequirePermission permission="exam.assign" />,
                children: [
                  { path: 'assignments', ...page(() => import('@/pages/exams/AssignmentsPage')) },
                ],
              },
              {
                element: <RequirePermission permission="leaderboard.read" />,
                children: [
                  {
                    path: 'leaderboard',
                    ...page(() => import('@/pages/insights/LeaderboardPage')),
                  },
                ],
              },
              {
                element: <RequirePermission permission="report.read" />,
                children: [
                  { path: 'reports', ...page(() => import('@/pages/insights/ReportsPage')) },
                ],
              },
              {
                element: <RequirePermission permission="student.read" />,
                children: [
                  { path: 'students', ...page(() => import('@/pages/students/StudentsPage')) },
                ],
              },
              {
                element: <RequirePermission permission="teacher.read" />,
                children: [
                  { path: 'teachers', ...page(() => import('@/pages/teachers/TeachersPage')) },
                ],
              },
              {
                element: <RequirePermission permission="settings.read" />,
                children: [
                  {
                    path: 'settings',
                    element: <Navigate to="/org/settings/permissions" replace />,
                  },
                  {
                    path: 'settings/permissions',
                    ...page(() => import('@/pages/organization/RolesPermissionsPage')),
                  },
                ],
              },
            ],
          },
          // Teachers reach the same screens from their own menu.
          {
            path: '/teacher',
            children: [
              { index: true, element: <Navigate to="/teacher/dashboard" replace /> },
              ...catalogRoutes,
              ...assessmentRoutes,
            ],
          },
          { path: '/student', children: studentRoutes },
        ],
      },
    ],
  },
  { path: '*', ...page(() => import('@/pages/public/NotFoundPage')) },
];

export const createRouter = () => createBrowserRouter(routes);
