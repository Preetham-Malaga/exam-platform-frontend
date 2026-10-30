// Every "Add" button opens its own page (prototype: no panels inside the list), with a breadcrumb back to the list.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import { meAs, mockApi, renderRoute } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const page = <T,>(items: T[]) => ({
  items,
  pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
});
const empty = () => ({ data: page([]) });

function setup() {
  resetFakeSupabase(fakeSession());
  mockApi({
    'GET /api/v1/me': () => ({ data: meAs('OWNER') }),
    'GET /api/v1/students': empty,
    'GET /api/v1/teachers': empty,
    'GET /api/v1/users': empty,
    'GET /api/v1/exams': empty,
    'GET /api/v1/questions': empty,
    'GET /api/v1/courses': empty,
    'GET /api/v1/subjects': empty,
    'GET /api/v1/topics': empty,
    'GET /api/v1/academic-units/tree': () => ({
      data: { levels: [], units: [], truncated: false },
    }),
    'GET /api/v1/catalog/tree': () => ({
      data: {
        courses: [{ id: 'c1', code: 'BT', name: 'B.Tech', status: 'active' }],
        subjects: [
          {
            id: 's1',
            code: 'M',
            name: 'Machines',
            status: 'active',
            courseId: 'c1',
            questionCount: 0,
          },
        ],
        topics: [],
        truncated: false,
      },
    }),
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('Add buttons open their own page', () => {
  const cases = [
    ['/org/students', 'students-add-btn', '/org/students/new', 'page-form-student', 'student-form'],
    ['/org/teachers', 'teachers-add-btn', '/org/teachers/new', 'page-form-teacher', 'teacher-form'],
    [
      '/org/admins',
      'users-invite-admin-btn',
      '/org/admins/new',
      'page-form-admin',
      'admin-invite-form',
    ],
    ['/org/exams', 'exams-add-btn', '/org/exams/new', 'page-form-exam', 'exam-form'],
  ] as const;
  for (const [list, btn, path, root, form] of cases)
    // path is only the test name: the page root and the breadcrumb prove the navigation.
    it(`${list} → ${path}`, async () => {
      setup();
      renderRoute(list);
      await userEvent.click(await screen.findByTestId(btn));
      expect(await screen.findByTestId(root)).toBeInTheDocument();
      expect(screen.getByTestId(form)).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-link')).toHaveAttribute('href', list);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

  it('the new-question page opens the editor for the first subject', async () => {
    setup();
    renderRoute('/org/questions/new');
    expect(await screen.findByTestId('page-form-question')).toBeInTheDocument();
    expect(await screen.findByTestId('question-editor')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb-link')).toHaveAttribute('href', '/org/questions');
  });
});
