// Courses (prototype vSyllabus): the tree from GET /catalog/tree, its own-route course / subject / topic forms, and the
// redirects from the old Academic Structure, Subjects and Topics addresses. Real routes and providers, mocked API.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTree, childLevels, unitOptions, unitPath } from '@/features/academic/tree';
import { autoCode } from '@/utils/autoCode';
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

const tree = {
  courses: [
    { id: 'c1', code: 'BTECH', name: 'B.Tech', status: 'active' },
    { id: 'c2', code: 'MBA', name: 'MBA', status: 'active' },
  ],
  subjects: [
    { id: 's1', code: 'MACH', name: 'Machines', status: 'active', courseId: 'c1', questionCount: 3 },
    { id: 's2', code: 'CIRC', name: 'Circuits', status: 'active', courseId: 'c1', questionCount: 0 },
    { id: 's9', code: 'LOOSE', name: 'Orphan', status: 'active', courseId: null, questionCount: 0 },
  ],
  topics: [
    { id: 't1', name: 'Motors', subjectId: 's1', position: 1, questionCount: 2 },
    { id: 't2', name: 'Transformers', subjectId: 's1', position: 2, questionCount: 0 },
  ],
  truncated: false,
};
const course = {
  id: 'c1',
  code: 'BTECH',
  name: 'B.Tech',
  description: null,
  status: 'active',
  details: { courseType: 'Degree', durationValue: 4, durationUnit: 'Years' },
  academicUnitId: null,
  academicUnitName: null,
  subjectCount: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

let calls: ReturnType<typeof mockApi>;
const called = (key: string) => calls.filter((c) => c.key === key);

function setup(role: keyof typeof PERMS, extra: Record<string, Handler> = {}) {
  resetFakeSupabase(fakeSession());
  calls = mockApi({
    'GET /api/v1/me': () => ({ data: meAs(role) }),
    'GET /api/v1/catalog/tree': () => ({ data: tree }),
    ...extra,
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('helpers', () => {
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
  it('suggests a code from a name like the prototype', () => {
    expect(autoCode('Machines Unit Test 2')).toBe('MUT2');
    expect(autoCode('B.Tech')).toBe('BTECH');
    expect(autoCode('  ')).toBe('');
  });
});

describe('Courses tree', () => {
  it('shows courses, subjects and topics from one request, first course open', async () => {
    setup('OWNER');
    renderRoute('/org/courses');
    const courses = await screen.findAllByTestId('syllabus-course-row');
    expect(courses.map((c) => c.dataset.entityCode)).toEqual(['BTECH', 'MBA', '—']);
    expect(courses[0]).toHaveAttribute('data-expanded', 'true');
    expect(within(courses[0]!).getByText('2 subjects · 3 questions')).toBeInTheDocument();
    expect(screen.getByTestId('syllabus-counts')).toHaveTextContent(
      '2 courses · 3 subjects · 2 topics',
    );
    expect(called('GET /api/v1/catalog/tree')).toHaveLength(1);
    expect(screen.getByTestId('page-syllabus')).toHaveAttribute('data-ready', 'true');
  });

  it('search opens every match and hides the rest', async () => {
    setup('OWNER');
    renderRoute('/org/courses');
    await screen.findAllByTestId('syllabus-course-row');
    await userEvent.click(screen.getAllByTestId('syllabus-subject-toggle-btn')[0]!);
    await userEvent.type(screen.getByTestId('syllabus-search-input'), 'transf');
    expect(screen.getAllByTestId('syllabus-course-row')).toHaveLength(1);
    expect(screen.getByText('Transformers')).toBeInTheDocument();
    await userEvent.clear(screen.getByTestId('syllabus-search-input'));
    await userEvent.type(screen.getByTestId('syllabus-search-input'), 'zzz');
    expect(screen.getByTestId('syllabus-empty')).toHaveTextContent('Nothing matches');
  });

  it('renames a subject in place with Enter', async () => {
    setup('OWNER', {
      'PATCH /api/v1/subjects/s2': ({ body }) => ({ data: { id: 's2', ...body } }),
    });
    renderRoute('/org/courses');
    await screen.findAllByTestId('syllabus-course-row');
    await userEvent.click(screen.getByRole('button', { name: 'Rename Circuits' }));
    const input = screen.getByTestId('syllabus-rename-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Circuit Theory{Enter}');
    await waitFor(() => expect(called('PATCH /api/v1/subjects/s2')).toHaveLength(1));
    expect(called('PATCH /api/v1/subjects/s2')[0]!.body).toEqual({ name: 'Circuit Theory' });
  });

  it('a subject with questions cannot be deleted; an empty one is confirmed in place', async () => {
    setup('OWNER', { 'DELETE /api/v1/subjects/s2': () => ({ data: { deleted: true } }) });
    renderRoute('/org/courses');
    await screen.findAllByTestId('syllabus-course-row');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Machines' }));
    const blocked = screen.getByTestId('syllabus-delete-confirm');
    expect(blocked).toHaveAttribute('data-state', 'blocked');
    expect(blocked).toHaveTextContent('Machines has 3 questions');
    await userEvent.click(within(blocked).getByTestId('syllabus-delete-cancel-btn'));

    await userEvent.click(screen.getByRole('button', { name: 'Delete Circuits' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('syllabus-delete-confirm-btn'));
    await waitFor(() => expect(called('DELETE /api/v1/subjects/s2')).toHaveLength(1));
  });

  it('add links go to their own pages', async () => {
    setup('OWNER');
    renderRoute('/org/courses');
    await screen.findAllByTestId('syllabus-course-row');
    expect(screen.getByTestId('syllabus-add-course-btn')).toHaveAttribute('href', '/org/courses/new');
    expect(screen.getAllByTestId('syllabus-add-subject-btn')[0]).toHaveAttribute(
      'href',
      '/org/courses/c1/subjects/new',
    );
  });

  it('a teacher sees the tree under /teacher without course or subject buttons', async () => {
    setup('TEACHER');
    renderRoute('/teacher/courses');
    await screen.findAllByTestId('syllabus-course-row');
    expect(screen.queryByTestId('syllabus-add-course-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('syllabus-course-delete-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('syllabus-subject-rename-btn')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('syllabus-add-topic-btn')[0]).toHaveAttribute(
      'href',
      '/teacher/subjects/s1/topics/new',
    );
  });

  it('old addresses lead to Courses; students cannot open it', async () => {
    for (const path of ['/org/academic', '/org/subjects', '/teacher/topics']) {
      setup(path.startsWith('/teacher') ? 'TEACHER' : 'OWNER');
      const { unmount } = renderRoute(path);
      expect(await screen.findByTestId('page-syllabus')).toBeInTheDocument();
      unmount();
    }
    setup('STUDENT');
    renderRoute('/org/courses');
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
  });
});

describe('Course, subject and topic pages', () => {
  it('new course: errors on save, code follows the name, details are sent', async () => {
    setup('OWNER', {
      'POST /api/v1/courses': ({ body }) => ({
        status: 201,
        data: { ...course, id: 'c3', ...body },
      }),
    });
    renderRoute('/org/courses/new');
    await screen.findByTestId('course-form');
    await userEvent.click(screen.getByTestId('course-form-save-btn'));
    expect(await screen.findByTestId('course-form-error-summary')).toHaveTextContent(
      'Fix 4 fields to save',
    );
    expect(screen.getByTestId('course-form-name-input')).toHaveFocus();

    await userEvent.type(screen.getByTestId('course-form-name-input'), 'Bachelor of Commerce');
    expect(screen.getByTestId('course-form-code-input')).toHaveValue('BOC');
    await userEvent.selectOptions(screen.getByTestId('course-form-course-type-select'), 'Degree');
    await userEvent.type(screen.getByTestId('course-form-duration-value-input'), '3');
    await userEvent.type(screen.getByTestId('course-form-start-date-input'), '2026-06-01');
    await userEvent.type(screen.getByTestId('course-form-end-date-input'), '2026-01-01');
    await userEvent.click(screen.getByTestId('course-form-save-btn'));
    expect(await screen.findByTestId('course-form-end-date-error')).toHaveTextContent(
      'on or after start date',
    );
    await userEvent.clear(screen.getByTestId('course-form-end-date-input'));
    await userEvent.click(screen.getByTestId('course-form-save-btn'));
    await waitFor(() => expect(called('POST /api/v1/courses')).toHaveLength(1));
    expect(called('POST /api/v1/courses')[0]!.body).toEqual({
      code: 'BOC',
      name: 'Bachelor of Commerce',
      description: null,
      details: {
        courseType: 'Degree',
        medium: 'English',
        durationValue: 3,
        durationUnit: 'Years',
        startDate: '2026-06-01',
      },
    });
    expect(await screen.findByTestId('page-syllabus')).toBeInTheDocument();
  });

  it('edit course loads the saved details and keeps its code', async () => {
    setup('OWNER', {
      'GET /api/v1/courses/c1': () => ({ data: course }),
      'PATCH /api/v1/courses/c1': ({ body }) => ({ data: { ...course, ...body } }),
    });
    renderRoute('/org/courses/c1/edit');
    await waitFor(() => expect(screen.getByTestId('course-form-name-input')).toHaveValue('B.Tech'));
    expect(screen.getByTestId('course-form-duration-value-input')).toHaveValue('4');
    await userEvent.type(screen.getByTestId('course-form-name-input'), ' Hons');
    expect(screen.getByTestId('course-form-code-input')).toHaveValue('BTECH');
    await userEvent.click(screen.getByTestId('course-form-save-btn'));
    await waitFor(() => expect(called('PATCH /api/v1/courses/c1')).toHaveLength(1));
    expect(called('PATCH /api/v1/courses/c1')[0]!.body).toMatchObject({
      name: 'B.Tech Hons',
      code: 'BTECH',
      status: 'active',
    });
  });

  it('new subject in a course: marks cannot exceed the maximum', async () => {
    setup('OWNER', {
      'POST /api/v1/subjects': ({ body }) => ({ status: 201, data: { id: 's5', ...body } }),
    });
    renderRoute('/org/courses/c1/subjects/new');
    await waitFor(() => expect(screen.getByTestId('subject-form-course-select')).toHaveValue('c1'));
    await userEvent.type(screen.getByTestId('subject-form-name-input'), 'Control Systems');
    await userEvent.clear(screen.getByTestId('subject-form-pass-marks-input'));
    await userEvent.type(screen.getByTestId('subject-form-pass-marks-input'), '150');
    await userEvent.click(screen.getByTestId('subject-form-save-btn'));
    expect(await screen.findByTestId('subject-form-pass-marks-error')).toHaveTextContent(
      "Can't be more than maximum marks.",
    );
    await userEvent.clear(screen.getByTestId('subject-form-pass-marks-input'));
    await userEvent.click(screen.getByTestId('subject-form-save-btn'));
    await waitFor(() => expect(called('POST /api/v1/subjects')).toHaveLength(1));
    expect(called('POST /api/v1/subjects')[0]!.body).toEqual({
      code: 'CS',
      name: 'Control Systems',
      description: null,
      courseId: 'c1',
      details: { subjectType: 'Theory', maxMarks: 100 },
    });
  });

  it('a teacher adds a topic to a subject; the course comes from the subject', async () => {
    setup('TEACHER', {
      'POST /api/v1/topics': ({ body }) => ({ status: 201, data: { id: 't9', ...body } }),
    });
    renderRoute('/teacher/subjects/s2/topics/new');
    await waitFor(() => expect(screen.getByTestId('topic-form-course-select')).toHaveValue('c1'));
    expect(screen.getByTestId('topic-form-subject-select')).toHaveValue('s2');
    await userEvent.type(screen.getByTestId('topic-form-name-input'), "Ohm's Law");
    const hard = screen
      .getAllByTestId('topic-form-difficulty-radio')
      .find((b) => b.dataset.value === 'Hard')!;
    await userEvent.click(hard);
    await userEvent.click(screen.getByTestId('topic-form-save-btn'));
    await waitFor(() => expect(called('POST /api/v1/topics')).toHaveLength(1));
    expect(called('POST /api/v1/topics')[0]!.body).toEqual({
      subjectId: 's2',
      name: "Ohm's Law",
      details: { difficulty: 'Hard', status: 'active' },
    });
    expect(await screen.findByTestId('page-syllabus')).toBeInTheDocument();
  });
});
