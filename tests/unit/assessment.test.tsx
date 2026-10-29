// Phases 11-15 UI: question bank, exam management, student exam screen, insights and dashboards (real routes + providers).
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateQuestion, type QuestionDraft } from '@/features/assessment/questionRules';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import { PERMS, meAs, mockApi, renderRoute, type Handler } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const page = <X,>(items: X[]) => ({
  items,
  pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
});
const subject = { id: 's1', code: 'EE201', name: 'Electrical Machines', status: 'active' };
const Q = (id: string, text: string, over: Record<string, unknown> = {}) => ({
  id,
  subjectId: 's1',
  subjectName: 'Electrical Machines',
  topicId: null,
  topicName: null,
  questionType: 'multiple_choice',
  questionText: text,
  difficulty: 'easy',
  marks: 2,
  negativeMarks: 0,
  status: 'published',
  ownerType: 'teacher',
  createdByName: 'Meera Nair',
  createdBy: 'u3',
  examCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const exam = (over: Record<string, unknown> = {}) => ({
  id: 'e1',
  examCode: 'UT1',
  name: 'Unit Test 1',
  description: 'Answer all questions.',
  status: 'draft',
  courseId: null,
  courseName: null,
  durationMinutes: 30,
  passingPercentage: 50,
  startAt: null,
  endAt: null,
  questionCount: 0,
  totalMarks: 0,
  assignmentCount: 0,
  attemptCount: 0,
  createdByName: 'Meera Nair',
  createdBy: 'u3',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  settings: {
    maxAttempts: 1,
    randomizeQuestions: false,
    randomizeOptions: false,
    showResults: true,
    showAnswers: false,
    leaderboardEnabled: false,
  },
  questions: [],
  assignments: [],
  ...over,
});

let calls: ReturnType<typeof mockApi>;
const called = (key: string) => calls.filter((c) => c.key === key);
function setup(role: keyof typeof PERMS, extra: Record<string, Handler> = {}) {
  resetFakeSupabase(fakeSession());
  calls = mockApi({
    'GET /api/v1/me': () => ({ data: meAs(role) }),
    'GET /api/v1/subjects': () => ({ data: page([subject]) }),
    'GET /api/v1/topics': () => ({ data: page([]) }),
    'GET /api/v1/courses': () => ({ data: page([]) }),
    'GET /api/v1/students': () => ({ data: page([]) }),
    'GET /api/v1/academic-units/tree': () => ({
      data: {
        levels: [],
        units: [
          { id: 'u1', code: 'BT', name: 'B.Tech', status: 'active', levelId: 'l1', parentId: null },
        ],
        truncated: false,
      },
    }),
    ...extra,
  });
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('question rules', () => {
  const d = (over: Partial<QuestionDraft> = {}): QuestionDraft => ({
    subjectId: 's1',
    topicId: '',
    questionType: 'multiple_choice',
    questionText: 'Q?',
    difficulty: 'easy',
    marks: '2',
    negativeMarks: '0',
    explanation: '',
    options: ['A', 'B'],
    correctOption: 0,
    ...over,
  });
  it('accepts a complete question and explains each problem', () => {
    expect(validateQuestion(d())).toEqual({});
    expect(validateQuestion(d({ options: ['A', ''] })).options).toMatch(/Fill in every option/);
    expect(validateQuestion(d({ options: ['A', 'a'] })).options).toMatch(/different/);
    expect(
      validateQuestion(d({ questionType: 'true_false', options: ['T', 'F', 'X'] })).options,
    ).toMatch(/exactly 2/);
    expect(validateQuestion(d({ negativeMarks: '3' })).negativeMarks).toMatch(/exceed/);
    expect(validateQuestion(d({ questionText: ' ', subjectId: '' }))).toMatchObject({
      questionText: expect.any(String),
      subjectId: expect.any(String),
    });
  });
});

describe('question bank', () => {
  it('lists questions and creates a published question with the chosen answer', async () => {
    setup('TEACHER', {
      'GET /api/v1/questions': () => ({ data: page([Q('q1', 'What is Ohm’s law about?')]) }),
      'POST /api/v1/questions': ({ body }) => ({
        status: 201,
        data: { ...Q('q2', body.questionText), options: [], correctOptionId: null },
      }),
    });
    renderRoute('/teacher/questions');
    expect(await screen.findByText('What is Ohm’s law about?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New question' }));
    const dialog = await screen.findByRole('region', { name: 'New question' });
    await waitFor(() => expect(within(dialog).getByLabelText(/Subject/)).toHaveValue('s1'));
    await userEvent.type(within(dialog).getByLabelText(/^Question/), 'Unit of resistance?');
    for (const [i, text] of ['Volt', 'Ohm', 'Ampere', 'Watt'].entries())
      await userEvent.type(within(dialog).getByLabelText(`Option ${i + 1}`), text);
    await userEvent.click(within(dialog).getByLabelText('Option 2 is correct'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save and publish' }));
    await waitFor(() => expect(called('POST /api/v1/questions')).toHaveLength(1));
    expect(called('POST /api/v1/questions')[0]!.body).toMatchObject({
      subjectId: 's1',
      questionType: 'multiple_choice',
      questionText: 'Unit of resistance?',
      options: ['Volt', 'Ohm', 'Ampere', 'Watt'],
      correctOption: 1,
      publish: true,
    });
  });

  it('students cannot open the question bank', async () => {
    setup('STUDENT');
    renderRoute('/org/questions');
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(called('GET /api/v1/questions')).toHaveLength(0);
  });
});

describe('exam page', () => {
  it('explains what is missing before publishing, adds questions and assigns the exam', async () => {
    let current = exam();
    setup('TEACHER', {
      'GET /api/v1/exams/e1': () => ({ data: current }),
      'GET /api/v1/questions': () => ({
        data: page([Q('q1', 'Unit of resistance?'), Q('q2', 'Unit of power?')]),
      }),
      'PUT /api/v1/exams/e1/questions': ({ body }) => {
        current = exam({
          questionCount: body.questionIds.length,
          updatedAt: '2026-01-02T00:00:00Z',
        });
        return { data: current };
      },
      'PUT /api/v1/exams/e1/assignments': ({ body }) => ({
        data: exam({ assignmentCount: body.targets.length }),
      }),
    });
    renderRoute('/teacher/exams/e1');
    expect(await screen.findByRole('heading', { name: 'Unit Test 1' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'add at least one question and assign the exam',
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();

    await userEvent.click(screen.getByRole('tab', { name: /Questions/ }));
    await userEvent.click(
      await screen.findByRole('button', { name: /Add question: Unit of power/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Add question: Unit of resistance/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save questions' }));
    await waitFor(() => expect(called('PUT /api/v1/exams/e1/questions')).toHaveLength(1));
    expect(called('PUT /api/v1/exams/e1/questions')[0]!.body).toEqual({
      questionIds: ['q2', 'q1'],
    });

    await userEvent.click(screen.getByRole('tab', { name: /Assignment/ }));
    await userEvent.click(await screen.findByLabelText('B.Tech'));
    await userEvent.click(screen.getByRole('button', { name: 'Save assignment' }));
    await waitFor(() => expect(called('PUT /api/v1/exams/e1/assignments')).toHaveLength(1));
    expect(called('PUT /api/v1/exams/e1/assignments')[0]!.body).toEqual({
      targets: [{ targetType: 'academic_unit', targetId: 'u1' }],
    });
  });

  it('a published exam is locked and can be unpublished', async () => {
    setup('OWNER', {
      'GET /api/v1/exams/e1': () => ({
        data: exam({ status: 'published', questionCount: 1, assignmentCount: 1 }),
      }),
      'POST /api/v1/exams/e1/unpublish': () => ({ data: exam({ status: 'unpublished' }) }),
    });
    renderRoute('/org/exams/e1');
    expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save details' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Questions/ }));
    expect(await screen.findByText(/This exam is published/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    await userEvent.click(
      within(await screen.findByRole('group', { name: 'Unpublish this exam?' })).getByRole(
        'button',
        {
          name: 'Unpublish',
        },
      ),
    );
    await waitFor(() => expect(called('POST /api/v1/exams/e1/unpublish')).toHaveLength(1));
  });
});

describe('student exam screen', () => {
  const paper = (deadlineInMs: number) => ({
    attemptId: 'a1',
    examId: 'e1',
    attemptNo: 1,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    deadlineAt: new Date(Date.now() + deadlineInMs).toISOString(),
    submittedAt: null,
    autoSubmitted: false,
    serverTime: new Date().toISOString(),
    examName: 'Unit Test 1',
    durationMinutes: 30,
    questions: [
      {
        id: 'q1',
        text: 'Unit of resistance?',
        type: 'multiple_choice',
        marks: 2,
        negativeMarks: 0,
        options: [
          { id: 'o1', text: 'Volt' },
          { id: 'o2', text: 'Ohm' },
        ],
      },
      {
        id: 'q2',
        text: 'Unit of power?',
        type: 'multiple_choice',
        marks: 2,
        negativeMarks: 0,
        options: [
          { id: 'o3', text: 'Watt' },
          { id: 'o4', text: 'Joule' },
        ],
      },
    ],
    answers: [],
  });
  const review = {
    result: {
      resultId: 'r1',
      attemptId: 'a1',
      examId: 'e1',
      score: 2,
      maximumScore: 4,
      percentage: 50,
      correctCount: 1,
      wrongCount: 0,
      unansweredCount: 1,
      durationSeconds: 95,
      status: 'Passed',
      evaluatedAt: '2026-01-01T00:00:00Z',
    },
    showAnswers: false,
    review: null,
  };

  it('saves each answer at once, shows the countdown, and submits after confirmation', async () => {
    setup('STUDENT', {
      'GET /api/v1/attempts/a1': () => ({ data: paper(30 * 60_000) }),
      'POST /api/v1/attempts/a1/answers': () => ({
        data: { saved: true, serverTime: new Date().toISOString() },
      }),
      'POST /api/v1/attempts/a1/submit': () => ({
        data: { submitted: true, result: review.result },
      }),
      'GET /api/v1/attempts/a1/review': () => ({ data: review }),
    });
    renderRoute('/student/attempts/a1');
    expect(await screen.findByText('Unit of resistance?')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/^(29|30):\d\d$/);
    expect(document.body.textContent).not.toMatch(/correct/i); // the paper carries no answer key
    await userEvent.click(screen.getByLabelText(/Ohm/));
    await waitFor(() => expect(called('POST /api/v1/attempts/a1/answers')).toHaveLength(1));
    expect(called('POST /api/v1/attempts/a1/answers')[0]!.body).toEqual({
      questionId: 'q1',
      optionId: 'o2',
      flagged: false,
    });
    expect(await screen.findByText('All answers saved')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Submit exam' }));
    const dialog = await screen.findByRole('group', { name: 'Submit your exam?' });
    expect(dialog).toHaveTextContent('You answered 1 of 2 questions; 1 unanswered');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(called('POST /api/v1/attempts/a1/submit')).toHaveLength(1));
    expect(await screen.findByRole('heading', { name: 'Your result' })).toBeInTheDocument();
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
  });

  it('submits automatically when the server deadline has passed', async () => {
    setup('STUDENT', {
      'GET /api/v1/attempts/a1': () => ({ data: paper(-1000) }),
      'POST /api/v1/attempts/a1/submit': () => ({
        data: { submitted: true, result: review.result },
      }),
      'GET /api/v1/attempts/a1/review': () => ({ data: review }),
    });
    renderRoute('/student/attempts/a1');
    await waitFor(() => expect(called('POST /api/v1/attempts/a1/submit')).toHaveLength(1));
    expect(await screen.findByText('Time is up')).toBeInTheDocument();
  });

  it('a failed save is shown and can be retried', async () => {
    let fail = true;
    setup('STUDENT', {
      'GET /api/v1/attempts/a1': () => ({ data: paper(30 * 60_000) }),
      'POST /api/v1/attempts/a1/answers': () =>
        fail
          ? { status: 503, error: { code: 'UNAVAILABLE', message: 'down' } }
          : { data: { saved: true, serverTime: '' } },
    });
    renderRoute('/student/attempts/a1');
    await userEvent.click(await screen.findByLabelText(/Volt/));
    expect(await screen.findByText(/Some answers are not saved/)).toBeInTheDocument();
    fail = false;
    await act(async () => userEvent.click(screen.getByRole('button', { name: 'Retry' })));
    expect(await screen.findByText('All answers saved')).toBeInTheDocument();
  });

  it('the exam list starts an attempt and opens the paper', async () => {
    setup('STUDENT', {
      'GET /api/v1/student/exams': () => ({
        data: {
          items: [
            {
              examId: 'e1',
              examCode: 'UT1',
              name: 'Unit Test 1',
              description: null,
              durationMinutes: 30,
              passingPercentage: 50,
              startAt: null,
              endAt: null,
              maxAttempts: 1,
              attemptsUsed: 0,
              runningAttemptId: null,
              showResults: true,
              leaderboardEnabled: false,
              questionCount: 2,
              totalMarks: 4,
            },
          ],
        },
      }),
      'POST /api/v1/exams/e1/start': () => ({
        data: { ...paper(30 * 60_000), questions: undefined },
      }),
      'GET /api/v1/attempts/a1': () => ({ data: paper(30 * 60_000) }),
    });
    renderRoute('/student/exams');
    await userEvent.click(await screen.findByRole('button', { name: 'Start Unit Test 1' }));
    await userEvent.click(
      within(await screen.findByRole('group', { name: 'Start Unit Test 1?' })).getByRole('button', {
        name: 'Start now',
      }),
    );
    expect(await screen.findByText('Unit of resistance?')).toBeInTheDocument();
    expect(called('POST /api/v1/exams/e1/start')).toHaveLength(1);
  });
});

describe('insights and dashboard', () => {
  const overview = {
    filter: { range: '30' },
    timezone: 'Asia/Kolkata',
    headline: {
      students: 124,
      batches: 4,
      examsOpen: 2,
      examsDraft: 2,
      results: 58,
      attempts: 58,
      averagePercentage: 68.7,
      passed: 5,
      passRate: 83,
      liveToday: null,
    },
    flow: {
      courses: { courses: 3, subjects: 5, topics: 10, subjectsWithoutTopics: 0 },
      questions: { total: 18, published: 14, draft: 4, easy: 7, medium: 7, hard: 4 },
      exams: { open: 2, draft: 2, closed: 1, attempts: 58 },
      students: { students: 124, batches: 4, teachers: 3, notInvited: 2, noBatch: 1 },
      results: { results: 6, averagePercentage: 68.7, passRate: 83, belowPass: 1 },
    },
    perDay: [
      { day: '2026-10-27', results: 2 },
      { day: '2026-10-28', results: 9 },
    ],
    exams: [
      {
        id: 'e1',
        name: 'Machines Mid-Term',
        code: 'MACHMT',
        state: 'published',
        startAt: '2026-10-28T03:30:00Z',
        endAt: '2099-10-31T18:00:00Z',
        durationMinutes: 60,
        courseName: 'B.Tech',
        questionCount: 3,
        assignmentCount: 1,
        students: 81,
        attempts: 41,
        averagePercentage: 69,
      },
      {
        id: 'e3',
        name: 'Exam-02',
        code: 'EXAM02',
        state: 'draft',
        startAt: null,
        endAt: null,
        durationMinutes: 60,
        courseName: 'B.Tech',
        questionCount: 0,
        assignmentCount: 0,
        students: 0,
        attempts: 0,
        averagePercentage: null,
      },
    ],
    recentResults: [
      {
        id: 'r1',
        studentName: 'Rahul Sen',
        rollNumber: '101',
        examName: 'Machines Mid-Term',
        percentage: 88,
        status: 'Passed',
        evaluatedAt: '2026-10-28T13:31:00Z',
      },
    ],
    topStudents: [],
    teachers: [],
  };

  it('the owner dashboard shows tiles, the five-step flow, attention items and exams from one call', async () => {
    setup('OWNER', {
      'GET /api/v1/organizations/current/overview': () => ({ data: overview }),
      'GET /api/v1/exams': () => ({ data: page([exam()]) }),
    });
    renderRoute('/org/dashboard');
    expect(await screen.findByTestId('dashboard-tile-students-value')).toHaveTextContent('124');
    expect(await screen.findByTestId('dashboard-tile-pass-rate-value')).toHaveTextContent('83%');
    expect(screen.getByTestId('dashboard-tile-avg-score-value')).toHaveTextContent('68.7%');
    expect(screen.getByTestId('dashboard-stage-questions-status')).toHaveTextContent(
      '4 drafts to review',
    );
    expect(screen.getByTestId('dashboard-stage-results-status')).toHaveTextContent(
      '1 need support',
    );
    const attention = screen.getAllByTestId('dashboard-attention-row').map((r) => r.textContent);
    expect(attention[0]).toContain(
      'Exam-02 is a draft with no questions, not assigned, no exam window',
    );
    expect(attention.join(' ')).toContain('2 students have not been invited');
    expect(screen.getAllByTestId('dashboard-exam-row')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Machines Mid-Term' })).toHaveAttribute(
      'href',
      '/org/exams/e1',
    );
    expect(screen.getByTestId('dashboard-stage-courses')).toHaveAttribute('href', '/org/courses');
    expect(screen.getByText('Rahul Sen')).toBeInTheDocument();
  });

  it('changing a filter asks the API again and can be reset', async () => {
    setup('OWNER', {
      'GET /api/v1/organizations/current/overview': () => ({ data: overview }),
      'GET /api/v1/exams': () => ({ data: page([exam()]) }),
    });
    renderRoute('/org/dashboard');
    await screen.findByTestId('dashboard-tile-students-value');
    expect(await screen.findByTestId('dashboard-filter-reset-btn')).toBeDisabled();
    await userEvent.selectOptions(
      await screen.findByTestId('dashboard-filter-date-range-select'),
      '7',
    );
    await waitFor(() =>
      expect(called('GET /api/v1/organizations/current/overview').at(-1)!.query).toMatchObject({
        range: '7',
      }),
    );
    await userEvent.click(await screen.findByTestId('dashboard-filter-reset-btn'));
    // Back to the default range; its numbers come from the cache, so no new request is needed.
    expect(screen.getByTestId('dashboard-filter-date-range-select')).toHaveValue('30');
    expect(screen.getByTestId('dashboard-filter-reset-btn')).toBeDisabled();
  });

  it('results open a drawer with each answer next to the correct one', async () => {
    setup('OWNER', {
      'GET /api/v1/exams': () => ({ data: page([exam()]) }),
      'GET /api/v1/results': () => ({
        data: page([
          {
            id: 'r1',
            attemptId: 'a1',
            examId: 'e1',
            examName: 'Unit Test 1',
            examCode: 'UT1',
            studentId: 'st1',
            studentName: 'Rahul Sen',
            rollNumber: '21EE001',
            academicUnitName: 'EEE',
            score: 2,
            maximumScore: 4,
            percentage: 50,
            status: 'Passed',
            correctCount: 1,
            wrongCount: 1,
            unansweredCount: 0,
            durationSeconds: 300,
            evaluatedAt: '2026-01-14T10:00:00Z',
            attemptNo: 1,
            autoSubmitted: false,
          },
        ]),
      }),
      'GET /api/v1/results/r1': () => ({
        data: {
          id: 'r1',
          attemptId: 'a1',
          examId: 'e1',
          examName: 'Unit Test 1',
          studentName: 'Rahul Sen',
          rollNumber: '21EE001',
          score: 2,
          maximumScore: 4,
          percentage: 50,
          status: 'Passed',
          correctCount: 1,
          wrongCount: 1,
          unansweredCount: 0,
          durationSeconds: 300,
          evaluatedAt: '',
          startedAt: '',
          submittedAt: '2026-01-14T10:00:00Z',
          autoSubmitted: false,
          attemptNo: 1,
          answers: [
            {
              questionId: 'q1',
              position: 1,
              questionText: 'Unit of resistance?',
              marks: 2,
              selectedOptionId: 'o1',
              correctOptionId: 'o2',
              isCorrect: false,
              marksAwarded: 0,
              options: [
                { id: 'o1', text: 'Volt' },
                { id: 'o2', text: 'Ohm' },
              ],
            },
          ],
        },
      }),
    });
    renderRoute('/org/results');
    await userEvent.click(await screen.findByRole('button', { name: 'View answers of Rahul Sen' }));
    const drawer = await screen.findByRole('region', { name: 'Rahul Sen · Unit Test 1' });
    expect(await within(drawer).findByText('1. Unit of resistance?')).toBeInTheDocument();
    expect(within(drawer).getByText('Wrong · 0/2 marks')).toBeInTheDocument();
  });

  it('reports: exam performance table', async () => {
    setup('OWNER', {
      'GET /api/v1/reports/exam-performance': () => ({
        data: {
          type: 'exam-performance',
          items: [
            {
              examId: 'e1',
              examName: 'Unit Test 1',
              examCode: 'UT1',
              status: 'published',
              attempts: 10,
              students: 9,
              averagePercentage: 62.5,
              highestPercentage: 95,
              lowestPercentage: 20,
              passed: 7,
              failed: 3,
              averageDurationSeconds: 900,
            },
          ],
        },
      }),
    });
    renderRoute('/org/reports');
    const row = await screen.findByRole('row', { name: /Unit Test 1/ });
    expect(row).toHaveTextContent('10 (9 students)');
    expect(row).toHaveTextContent('62.5%');
    expect(row).toHaveTextContent('15m 0s');
  });

  it('who may open what', async () => {
    for (const [role, path, allowed] of [
      ['STUDENT', '/org/dashboard', false],
      ['STUDENT', '/org/results', false],
      ['TEACHER', '/org/assignments', true],
      ['TEACHER', '/org/reports', true],
    ] as const) {
      setup(role, {
        'GET /api/v1/exams': () => ({ data: page([]) }),
        'GET /api/v1/reports/exam-performance': () => ({ data: { type: 'x', items: [] } }),
      });
      const { unmount } = renderRoute(path);
      if (allowed)
        expect(
          await screen.findByRole('heading', { level: 1 }),
          `${role} ${path}`,
        ).not.toHaveTextContent('access');
      else
        expect(
          await screen.findByText('You do not have access to this page'),
          `${role} ${path}`,
        ).toBeInTheDocument();
      unmount();
    }
  });
});
