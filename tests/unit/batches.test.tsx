// Batches (prototype vBatches, SPEC.batch): tiles with counts, the no-batch warning, the form page, delete in place.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import { meAs, mockApi, renderRoute, type Handler } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const batch = (id: string, name: string, studentCount: number) => ({
  id,
  code: id.toUpperCase(),
  name,
  courseId: 'c1',
  courseName: 'B.Tech',
  academicYear: '2026–27',
  yearSem: null,
  section: 'A',
  mode: 'Offline',
  timing: null,
  startDate: '2026-06-01',
  endDate: null,
  capacity: null,
  classTeacherId: null,
  classTeacherName: null,
  room: null,
  status: 'active',
  studentCount,
});

let calls: ReturnType<typeof mockApi>;
const called = (k: string) => calls.filter((c) => c.key === k);
function setup(extra: Record<string, Handler> = {}) {
  resetFakeSupabase(fakeSession());
  calls = mockApi({
    'GET /api/v1/me': () => ({ data: meAs('OWNER') }),
    'GET /api/v1/batches': () => ({
      data: {
        items: [batch('bt26a', 'B.Tech 2026 · Sec A', 40), batch('mt26', 'M.Tech 2026', 0)],
        studentsWithoutBatch: 1,
      },
    }),
    'GET /api/v1/catalog/tree': () => ({
      data: {
        courses: [{ id: 'c1', code: 'BT', name: 'B.Tech', status: 'active' }],
        subjects: [],
        topics: [],
        truncated: false,
      },
    }),
    'GET /api/v1/teachers': () => ({
      data: { items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 1 } },
    }),
    ...extra,
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('Batches', () => {
  it('shows a tile per batch with its students, and warns about students without a batch', async () => {
    setup();
    renderRoute('/org/batches');
    const tiles = await screen.findAllByTestId('batch-tile');
    expect(tiles.map((t) => t.dataset.entityCode)).toEqual(['BT26A', 'MT26']);
    expect(tiles[0]).toHaveTextContent('40 students · B.Tech · 2026–27');
    expect(within(tiles[0]!).getByTestId('batch-tile-students-link')).toHaveAttribute(
      'href',
      '/org/students?batch=bt26a',
    );
    expect(screen.getByTestId('batches-summary')).toHaveTextContent('2 batches · 40 students');
    expect(screen.getByTestId('batches-no-batch-warning')).toHaveTextContent(
      '1 student has no batch',
    );
    expect(screen.getByTestId('batches-add-tile-btn')).toHaveAttribute('href', '/org/batches/new');
  });

  it('deletes an empty batch after confirming in place', async () => {
    setup({ 'DELETE /api/v1/batches/mt26': () => ({ data: { deleted: true } }) });
    renderRoute('/org/batches');
    const tiles = await screen.findAllByTestId('batch-tile');
    await userEvent.click(within(tiles[1]!).getByTestId('batch-tile-delete-btn'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('batches-delete-confirm-btn'));
    await waitFor(() => expect(called('DELETE /api/v1/batches/mt26')).toHaveLength(1));
  });

  it('the new-batch page checks required fields and sends the batch', async () => {
    setup({
      'POST /api/v1/batches': ({ body }) => ({
        status: 201,
        data: { ...batch('x', body.name, 0), ...body },
      }),
    });
    renderRoute('/org/batches/new');
    await screen.findByTestId('batch-form');
    await userEvent.click(screen.getByTestId('batch-form-save-btn'));
    expect(await screen.findByTestId('batch-form-error-summary')).toHaveTextContent(
      'Fix 4 fields to save',
    );
    await userEvent.type(screen.getByTestId('batch-form-name-input'), 'B.Tech 2026 Sec C');
    expect(screen.getByTestId('batch-form-code-input')).toHaveValue('B2SC');
    await waitFor(() =>
      expect(screen.getByTestId('batch-form-course-select')).toContainHTML('B.Tech'),
    );
    await userEvent.selectOptions(screen.getByTestId('batch-form-course-select'), 'c1');
    await userEvent.type(screen.getByTestId('batch-form-start-date-input'), '2026-06-01');
    await userEvent.click(screen.getByTestId('batch-form-save-btn'));
    await waitFor(() => expect(called('POST /api/v1/batches')).toHaveLength(1));
    expect(called('POST /api/v1/batches')[0]!.body).toMatchObject({
      name: 'B.Tech 2026 Sec C',
      code: 'B2SC',
      courseId: 'c1',
      academicYear: '2026–27',
      mode: 'Offline',
      startDate: '2026-06-01',
      status: 'active',
    });
    expect(await screen.findByTestId('page-batches')).toBeInTheDocument();
  });
});
