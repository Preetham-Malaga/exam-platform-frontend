// Test helpers: a tiny fake API server (fetch) and a renderer that mounts the REAL routes with the REAL providers.
import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { Providers } from '@/app/providers';
import { PERMISSIONS } from '@/utils/permissions';
import { routes } from '@/app/routes';

export interface Reply {
  status?: number;
  data?: unknown;
  error?: { code: string; message: string; details?: unknown };
}
export type Handler = (req: {
  body: any;
  auth: string | null;
  query: Record<string, string>;
}) => Reply | Promise<Reply>;
export interface RecordedCall {
  key: string;
  body: any;
  auth: string | null;
  query: Record<string, string>;
}

/** Replaces fetch. `table` is read on every call, so tests can change handlers while the app is running. */
export function mockApi(table: Record<string, Handler>): RecordedCall[] {
  const calls: RecordedCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const u = new URL(url);
      const query = Object.fromEntries(u.searchParams.entries());
      const key = `${init.method ?? 'GET'} ${u.pathname}`;
      const body = init.body ? JSON.parse(init.body as string) : undefined;
      const auth = (init.headers as Record<string, string> | undefined)?.Authorization ?? null;
      calls.push({ key, body, auth, query });
      const handler = table[key];
      const r: Reply = handler
        ? await handler({ body, auth, query })
        : { status: 404, error: { code: 'NOT_FOUND', message: 'Not found' } };
      const status = r.status ?? 200;
      const payload =
        status < 400
          ? { success: true, data: r.data, error: null, requestId: 'r' }
          : { success: false, data: null, error: r.error, requestId: 'r' };
      return new Response(JSON.stringify(payload), { status });
    }),
  );
  return calls;
}

export const meFor = (over: Record<string, unknown> = {}) => ({
  user: { id: 'u1', email: 'owner@college.test', fullName: 'Asha Verma' },
  isPlatformAdmin: false,
  organization: { id: 'o1', code: 'ORG-000007', name: 'Demo College', status: 'active' },
  roles: ['ORGANIZATION_OWNER'],
  permissions: ['organization.read', 'organization.update', 'settings.read'],
  scopes: [],
  studentId: null,
  ...over,
});

/** Mounts the real route table at `path` inside the real providers. */
export function renderRoute(path: string, state?: unknown) {
  const router = createMemoryRouter(routes, {
    initialEntries: [state === undefined ? path : { pathname: path, state }],
  });
  const view = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { router, ...view };
}

// ---- role fixtures: the same permission sets the database seeds ----
const ADMIN_EXCLUDED = ['organization.update', 'subscription.read'];
export const PERMS = {
  OWNER: [...PERMISSIONS] as string[],
  ADMIN: PERMISSIONS.filter((p) => !ADMIN_EXCLUDED.includes(p)) as string[],
  TEACHER: [
    'course.read',
    'subject.read',
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
    'student.read',
    'result.read',
    'report.read',
    'leaderboard.read',
    'notification.read',
    'organization.read',
    'learning.read',
    'learning.manage',
  ],
  STUDENT: ['leaderboard.read', 'notification.read', 'learning.read'],
};
const ROLE_CODE = {
  OWNER: 'ORGANIZATION_OWNER',
  ADMIN: 'ORGANIZATION_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;
export const meAs = (role: keyof typeof PERMS, over: Record<string, unknown> = {}) =>
  meFor({ roles: [ROLE_CODE[role]], permissions: PERMS[role], ...over });
export const rolesPayload = () => ({
  roles: (['OWNER', 'ADMIN', 'TEACHER', 'STUDENT'] as const).map((r) => ({
    code: ROLE_CODE[r],
    name: r.charAt(0) + r.slice(1).toLowerCase(),
    permissions: PERMS[r],
  })),
});
