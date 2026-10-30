// Learning (prototype vLive, vRecorded, vMaterials): lists for staff and students, Join only when live, the form pages.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { liveState } from '@/features/learning/learning';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import { meAs, mockApi, renderRoute, type Handler, type PERMS } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const now = Date.now();
const live = (id: string, startsInMin: number, over: Record<string, unknown> = {}) => ({
  id,
  title: `Class ${id}`,
  courseId: 'c1',
  courseName: 'B.Tech',
  subjectId: 's1',
  subjectName: 'Machines',
  topicId: null,
  batchId: 'b1',
  batchName: 'Sec A',
  teacherId: null,
  teacherName: 'Lakshmi Rao',
  agenda: null,
  startsAt: new Date(now + startsInMin * 60_000).toISOString(),
  durationMinutes: 60,
  platform: 'Google Meet',
  meetingLink: 'https://meet.google.com/abc-defg-hij',
  meetingId: null,
  passcode: null,
  willRecord: false,
  status: 'scheduled',
  hasRecording: false,
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
});
const empty = { items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 1 } };

let calls: ReturnType<typeof mockApi>;
const called = (k: string) => calls.filter((c) => c.key === k);
function setup(role: keyof typeof PERMS, extra: Record<string, Handler> = {}) {
  resetFakeSupabase(fakeSession());
  calls = mockApi({
    'GET /api/v1/me': () => ({ data: meAs(role) }),
    'GET /api/v1/live-classes': () => ({ data: { items: [live('l1', -5), live('l2', 180)] } }),
    'GET /api/v1/recordings': () => ({ data: { items: [] } }),
    'GET /api/v1/materials': () => ({ data: { items: [] } }),
    'GET /api/v1/batches': () => ({
      data: {
        items: [{ id: 'b1', code: 'A', name: 'Sec A', studentCount: 1 }],
        studentsWithoutBatch: 0,
      },
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
    'GET /api/v1/teachers': () => ({ data: empty }),
    ...extra,
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('Learning', () => {
  it('Join opens from 10 minutes before the start until the end', () => {
    const at = (min: number) => ({
      startsAt: new Date(now + min * 60_000).toISOString(),
      durationMinutes: 60,
    });
    expect(liveState(at(30), now)).toBe('upcoming');
    expect(liveState(at(9), now)).toBe('live');
    expect(liveState(at(-30), now)).toBe('live');
    expect(liveState(at(-61), now)).toBe('past');
  });

  it('a student sees Join for a live class, a disabled Join for a later one, and no staff buttons', async () => {
    setup('STUDENT');
    renderRoute('/student/live');
    const rows = await screen.findAllByTestId('live-row');
    expect(rows.map((r) => r.dataset.state)).toEqual(['live', 'upcoming']);
    expect(within(rows[0]!).getByTestId('live-row-join-btn')).toHaveAttribute(
      'href',
      'https://meet.google.com/abc-defg-hij',
    );
    expect(within(rows[1]!).getByTestId('live-row-join-btn')).toBeDisabled();
    expect(screen.queryByTestId('live-schedule-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-classes-row-edit-btn')).not.toBeInTheDocument();
    expect(called('GET /api/v1/live-classes')[0]!.query).toMatchObject({ when: 'today' });
  });

  it('staff schedule a class on its own page', async () => {
    setup('TEACHER', { 'POST /api/v1/live-classes': () => ({ status: 201, data: { id: 'l9' } }) });
    renderRoute('/teacher/live/new');
    await screen.findByTestId('live-form');
    await userEvent.click(screen.getByTestId('live-form-save-btn'));
    expect(await screen.findByTestId('live-form-error-summary')).toHaveTextContent(
      'Fix 5 fields to save',
    );
    await userEvent.type(screen.getByTestId('live-form-title-input'), 'Induction Motors — Q&A');
    await waitFor(() =>
      expect(screen.getByTestId('live-form-batch-select')).toContainHTML('Sec A'),
    );
    await userEvent.selectOptions(screen.getByTestId('live-form-batch-select'), 'b1');
    await userEvent.type(screen.getByTestId('live-form-date-input'), '2026-11-02');
    await userEvent.type(screen.getByTestId('live-form-start-input'), '10:00');
    await userEvent.type(screen.getByTestId('live-form-link-input'), 'meet.google.com/x');
    await userEvent.click(screen.getByTestId('live-form-save-btn'));
    expect(await screen.findByTestId('live-form-link-error')).toHaveTextContent('https://');
    await userEvent.clear(screen.getByTestId('live-form-link-input'));
    await userEvent.type(screen.getByTestId('live-form-link-input'), 'https://meet.google.com/x');
    await userEvent.click(screen.getByTestId('live-form-save-btn'));
    await waitFor(() => expect(called('POST /api/v1/live-classes')).toHaveLength(1));
    expect(called('POST /api/v1/live-classes')[0]!.body).toMatchObject({
      title: 'Induction Motors — Q&A',
      batchId: 'b1',
      durationMinutes: 60,
      platform: 'Google Meet',
      meetingLink: 'https://meet.google.com/x',
      status: 'scheduled',
    });
    expect(await screen.findByTestId('page-live')).toBeInTheDocument();
  });

  it('materials and recordings show their empty states and add buttons for staff', async () => {
    setup('OWNER');
    const { unmount } = renderRoute('/org/materials');
    expect(await screen.findByTestId('materials-empty')).toBeInTheDocument();
    expect(screen.getByTestId('materials-add-btn')).toHaveAttribute('href', '/org/materials/new');
    unmount();
    renderRoute('/org/recorded');
    expect(await screen.findByTestId('recorded-empty')).toBeInTheDocument();
    expect(screen.getByTestId('recorded-add-btn')).toHaveAttribute('href', '/org/recorded/new');
  });
});
