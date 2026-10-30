// Exams list (prototype vExams): Draft / Published / Closed tabs with counts, row actions, duplicate, unpublish in place.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import { meAs, mockApi, renderRoute, type Handler } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const exam = (id: string, state: string, over: Record<string, unknown> = {}) => ({
  id,
  examCode: id.toUpperCase(),
  name: `Exam ${id}`,
  description: null,
  status: state === 'draft' ? 'draft' : 'published',
  state,
  courseId: 'c1',
  courseName: 'B.Tech',
  durationMinutes: 60,
  passingPercentage: 40,
  startAt: '2026-10-28T03:30:00Z',
  endAt: '2026-10-31T18:00:00Z',
  questionCount: 3,
  totalMarks: 12,
  assignmentCount: 1,
  attemptCount: 0,
  createdByName: 'Owner',
  createdBy: 'u1',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...over,
});
const lists: Record<string, unknown[]> = {
  draft: [exam('d1', 'draft')],
  published: [exam('p1', 'published'), exam('p2', 'published', { attemptCount: 41 })],
  closed: [],
};

let calls: ReturnType<typeof mockApi>;
const called = (k: string) => calls.filter((c) => c.key === k);
function setup(extra: Record<string, Handler> = {}) {
  resetFakeSupabase(fakeSession());
  calls = mockApi({
    'GET /api/v1/me': () => ({ data: meAs('OWNER') }),
    'GET /api/v1/exams': ({ query }) => {
      const items = lists[query.state ?? 'draft'] ?? [];
      return {
        data: {
          items,
          pagination: { page: 1, pageSize: 100, total: items.length, totalPages: 1 },
          counts: { draft: 1, published: 2, closed: 0 },
        },
      };
    },
    ...extra,
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('Exams list', () => {
  it('shows tabs with counts and draft actions first', async () => {
    setup();
    renderRoute('/org/exams');
    const row = await screen.findByTestId('exam-row');
    expect(row).toHaveAttribute('data-state', 'draft');
    expect(screen.getByTestId('exams-tab-draft-count')).toHaveTextContent('1');
    expect(screen.getByTestId('exams-tab-published-count')).toHaveTextContent('2');
    expect(within(row).getByTestId('exam-row-edit-btn')).toHaveAttribute('href', '/org/exams/d1');
    expect(within(row).getByTestId('exam-row-delete-btn')).toBeInTheDocument();
    expect(called('GET /api/v1/exams')[0]!.query).toMatchObject({ state: 'draft' });
  });

  it('published: unpublish only without attempts (confirmed in place), otherwise locked; duplicate opens the copy', async () => {
    setup({
      'POST /api/v1/exams/p1/unpublish': () => ({ data: exam('p1', 'draft') }),
      'POST /api/v1/exams/p2/duplicate': () => ({ status: 201, data: exam('p3', 'draft') }),
      'GET /api/v1/exams/p3': () => ({
        data: { ...exam('p3', 'draft'), settings: null, questions: [], assignments: [] },
      }),
    });
    renderRoute('/org/exams?tab=published');
    const rows = await screen.findAllByTestId('exam-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[1]!).getByTestId('exam-row-locked-badge')).toBeInTheDocument();
    await userEvent.click(within(rows[0]!).getByTestId('exam-row-unpublish-btn'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('exams-unpublish-confirm-btn'));
    await waitFor(() => expect(called('POST /api/v1/exams/p1/unpublish')).toHaveLength(1));
    await userEvent.click(
      within(screen.getAllByTestId('exam-row')[1]!).getByTestId('exam-row-duplicate-btn'),
    );
    await waitFor(() => expect(called('POST /api/v1/exams/p2/duplicate')).toHaveLength(1));
  });

  it('the old Published Exams address opens the Published tab', async () => {
    setup();
    renderRoute('/org/exams/published');
    await screen.findAllByTestId('exam-row');
    expect(screen.getByTestId('exams-tab-published')).toHaveAttribute('aria-selected', 'true');
  });
});
