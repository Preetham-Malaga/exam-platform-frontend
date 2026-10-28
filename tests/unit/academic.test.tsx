// Phase 8: academic structure screens (levels, unit tree, courses, subjects, topics) with the real routes and providers.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTree, childLevels, unitOptions, unitPath } from '@/features/academic/tree';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import { PERMS, meAs, mockApi, renderRoute, type Handler } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const L = (id: string, name: string, position: number, unitCount = 0) => ({
  id,
  code: name.toLowerCase(),
  name,
  position,
  unitCount,
});
const levels = [L('l1', 'Program', 1, 1), L('l2', 'Branch', 2, 2), L('l3', 'Year', 3)];
const N = (id: string, name: string, levelId: string, parentId: string | null) => ({
  id,
  code: `CODE-${id}`,
  name,
  status: 'active',
  levelId,
  parentId,
});
const units = [
  N('u1', 'B.Tech', 'l1', null),
  N('u3', 'EEE', 'l2', 'u1'),
  N('u2', 'CSE', 'l2', 'u1'),
];
const page = <T,>(items: T[]) => ({
  items,
  pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
});
const course = {
  id: 'c1',
  code: 'BT',
  name: 'B.Tech Programme',
  description: null,
  status: 'active',
  academicUnitId: 'u1',
  academicUnitName: 'B.Tech',
  subjectCount: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const subject = (id: string, name: string) => ({
  id,
  code: id.toUpperCase(),
  name,
  description: null,
  status: 'active',
  courseId: 'c1',
  courseName: 'B.Tech Programme',
  academicUnitId: 'u3',
  academicUnitName: 'EEE',
  topicCount: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});
const topic = {
  id: 't1',
  subjectId: 's1',
  subjectName: 'Electrical Machines',
  name: 'Transformers',
  position: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

let calls: ReturnType<typeof mockApi>;
const called = (key: string) => calls.filter((c) => c.key === key);

function setup(role: keyof typeof PERMS, extra: Record<string, Handler> = {}) {
  resetFakeSupabase(fakeSession());
  calls = mockApi({
    'GET /api/v1/me': () => ({ data: meAs(role) }),
    'GET /api/v1/academic-levels': () => ({ data: { items: levels } }),
    'GET /api/v1/academic-units/tree': () => ({ data: { levels, units, truncated: false } }),
    'GET /api/v1/courses': () => ({ data: page([course]) }),
    'GET /api/v1/subjects': () => ({
      data: page([subject('s1', 'Electrical Machines'), subject('s2', 'Power Systems')]),
    }),
    'GET /api/v1/topics': () => ({ data: page([topic]) }),
    ...extra,
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('tree helpers', () => {
  it('nests units by parent, sorted by name, with depth', () => {
    const roots = buildTree(units as never);
    expect(roots.map((r) => r.name)).toEqual(['B.Tech']);
    expect(roots[0]!.children.map((c) => [c.name, c.depth])).toEqual([
      ['CSE', 1],
      ['EEE', 1],
    ]);
  });
  it('labels units with their full path in tree order', () => {
    expect(unitPath(units as never, 'u3')).toBe('B.Tech / EEE');
    expect(unitOptions(units as never).map((o) => o.label)).toEqual([
      'B.Tech',
      'B.Tech / CSE',
      'B.Tech / EEE',
    ]);
  });
  it('offers only levels below the parent for a new child', () => {
    expect(childLevels(levels, null).map((l) => l.name)).toEqual(['Program', 'Branch', 'Year']);
    expect(childLevels(levels, units[1] as never).map((l) => l.name)).toEqual(['Year']);
  });
});

describe('Academic Structure page', () => {
  it('shows the levels in order and the unit tree', async () => {
    setup('OWNER');
    renderRoute('/org/academic');
    const list = await screen.findByRole('list', { name: 'Levels in order' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringContaining('Program'),
      expect.stringContaining('Branch'),
      expect.stringContaining('Year'),
    ]);
    const tree = await screen.findByRole('list', { name: 'Academic units' });
    for (const n of ['B.Tech', 'CSE', 'EEE']) expect(within(tree).getByText(n)).toBeInTheDocument();
  });

  it('adds a level and moves a level down (sends the complete new order)', async () => {
    setup('OWNER', {
      'POST /api/v1/academic-levels': ({ body }) => ({ status: 201, data: L('l4', body.name, 4) }),
      'PUT /api/v1/academic-levels/order': ({ body }) => ({
        data: { items: body.levelIds.map((id: string) => levels.find((l) => l.id === id)) },
      }),
    });
    renderRoute('/org/academic');
    await userEvent.type(await screen.findByLabelText('New level'), 'Section');
    await userEvent.click(screen.getByRole('button', { name: 'Add level' }));
    await waitFor(() => expect(called('POST /api/v1/academic-levels')).toHaveLength(1));
    expect(called('POST /api/v1/academic-levels')[0]!.body).toEqual({ name: 'Section' });

    await userEvent.click(screen.getByRole('button', { name: 'Move Program down' }));
    await waitFor(() => expect(called('PUT /api/v1/academic-levels/order')).toHaveLength(1));
    expect(called('PUT /api/v1/academic-levels/order')[0]!.body).toEqual({
      levelIds: ['l2', 'l1', 'l3'],
    });
  });

  it('a level that units use cannot be deleted from the screen', async () => {
    setup('OWNER');
    renderRoute('/org/academic');
    expect(await screen.findByRole('button', { name: 'Delete Program' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete Year' })).toBeEnabled();
  });

  it('adds a sub-unit: only lower levels are offered and the parent is sent', async () => {
    setup('OWNER', {
      'POST /api/v1/academic-units': ({ body }) => ({ status: 201, data: { id: 'u9', ...body } }),
    });
    renderRoute('/org/academic');
    await userEvent.click(await screen.findByRole('button', { name: 'Add a unit under EEE' }));
    const dialog = await screen.findByRole('region', { name: 'Add a unit under EEE' });
    const level = within(dialog).getByLabelText(/Level/);
    expect(
      within(level)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Year']);
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Year 2');
    await userEvent.type(within(dialog).getByLabelText(/Code/), 'EEE-Y2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add unit' }));
    await waitFor(() => expect(called('POST /api/v1/academic-units')).toHaveLength(1));
    expect(called('POST /api/v1/academic-units')[0]!.body).toEqual({
      levelId: 'l3',
      parentId: 'u3',
      code: 'EEE-Y2',
      name: 'Year 2',
    });
    expect(await screen.findByText('Unit added')).toBeInTheDocument();
  });

  it('validates the code before sending anything', async () => {
    setup('OWNER');
    renderRoute('/org/academic');
    await userEvent.click(await screen.findByRole('button', { name: 'Add top-level unit' }));
    const dialog = await screen.findByRole('region', { name: 'Add a top-level unit' });
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'MBA');
    await userEvent.type(within(dialog).getByLabelText(/Code/), 'has space');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add unit' }));
    expect(await within(dialog).findByText(/no spaces/)).toBeInTheDocument();
    expect(called('POST /api/v1/academic-units')).toHaveLength(0);
  });

  it("shows the server's reason when a unit cannot be deleted", async () => {
    setup('OWNER', {
      'DELETE /api/v1/academic-units/u1': () => ({
        status: 409,
        error: {
          code: 'UNIT_IN_USE',
          message:
            'This unit still has sub-units, courses, subjects or students. Move or delete them first.',
        },
      }),
    });
    renderRoute('/org/academic');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete B.Tech' }));
    const dialog = await screen.findByRole('group', { name: 'Delete this unit?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete unit' }));
    expect(await screen.findByText('Could not delete the unit')).toBeInTheDocument();
    expect(
      screen.getByText(/still has sub-units, courses, subjects or students/),
    ).toBeInTheDocument();
  });

  it('teachers and students cannot open it', async () => {
    for (const role of ['TEACHER', 'STUDENT'] as const) {
      setup(role);
      const { unmount } = renderRoute('/org/academic');
      expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
      expect(called('GET /api/v1/academic-units/tree')).toHaveLength(0);
      unmount();
    }
  });
});

describe('Courses page', () => {
  it('lists courses and creates one (empty unit and description become null)', async () => {
    setup('ADMIN', {
      'POST /api/v1/courses': ({ body }) => ({
        status: 201,
        data: { ...course, id: 'c2', ...body },
      }),
    });
    renderRoute('/org/courses');
    expect(await screen.findByText('B.Tech Programme')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New course' }));
    const dialog = await screen.findByRole('region', { name: 'New course' });
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'MBA');
    await userEvent.type(within(dialog).getByLabelText(/Code/), 'MBA');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create course' }));
    await waitFor(() => expect(called('POST /api/v1/courses')).toHaveLength(1));
    expect(called('POST /api/v1/courses')[0]!.body).toEqual({
      code: 'MBA',
      name: 'MBA',
      description: null,
      academicUnitId: null,
    });
  });

  it('filters by unit (the picker shows full paths)', async () => {
    setup('OWNER');
    renderRoute('/org/courses');
    await screen.findByText('B.Tech Programme');
    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'B.Tech / EEE');
    await waitFor(() =>
      expect(called('GET /api/v1/courses').at(-1)!.query).toMatchObject({
        academicUnitId: 'u3',
        page: '1',
      }),
    );
  });

  it('a teacher sees courses read-only', async () => {
    setup('TEACHER');
    renderRoute('/org/courses');
    expect(await screen.findByText('B.Tech Programme')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New course' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument();
  });
});

describe('Subjects and topics for a teacher', () => {
  it('the teacher menu leads to their subjects, read-only', async () => {
    setup('TEACHER');
    renderRoute('/teacher/subjects');
    expect(await screen.findByText('Electrical Machines')).toBeInTheDocument();
    expect(screen.getByText('The subjects assigned to you.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New subject' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument();
  });

  it('a teacher adds a topic to one of their subjects', async () => {
    setup('TEACHER', {
      'POST /api/v1/topics': ({ body }) => ({ status: 201, data: { ...topic, id: 't2', ...body } }),
    });
    renderRoute('/teacher/topics');
    expect(await screen.findByText('Transformers')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New topic' }));
    const dialog = await screen.findByRole('region', { name: 'New topic' });
    await userEvent.selectOptions(within(dialog).getByLabelText(/Subject/), 'Power Systems (S2)');
    await userEvent.type(within(dialog).getByLabelText(/Topic name/), 'Load flow');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add topic' }));
    await waitFor(() => expect(called('POST /api/v1/topics')).toHaveLength(1));
    expect(called('POST /api/v1/topics')[0]!.body).toEqual({ subjectId: 's2', name: 'Load flow' });
    // a teacher may rename and delete topics (RLS limits it to their own subjects)
    expect(screen.getByRole('button', { name: 'Actions for Transformers' })).toBeInTheDocument();
  });

  it('students cannot open subjects or topics', async () => {
    for (const path of ['/teacher/subjects', '/org/topics']) {
      setup('STUDENT');
      const { unmount } = renderRoute(path);
      expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
      unmount();
    }
  });
});
