// PURPOSE: API calls for the question bank, exams, the student exam engine, results, leaderboards, reports, dashboard.
// WHY: Pages never build URLs or parse envelopes. The organization is never sent: the API derives it from the session.
// DEPENDS ON: lib/api.ts, types/assessment.ts.

import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';
import type { Overview, OverviewFilter } from '@/types/overview';
import type {
  Assignment,
  AvailableExam,
  Exam,
  ExamBody,
  ExamList,
  ExamListParams,
  ExamPerformance,
  LeaderboardRow,
  LeaderboardScope,
  MyResult,
  Paper,
  Question,
  QuestionBody,
  QuestionList,
  QuestionListParams,
  QuestionPerformance,
  ResultDetail,
  ResultList,
  Review,
  StudentPerformance,
  SubmitResponse,
  AttemptMeta,
  ExamState,
  QuestionImportResult,
  QuestionImportRow,
} from '@/types/assessment';

const P = API_PREFIX;
const qs = (o: Record<string, string | number | boolean | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(o))
    if (v !== undefined && v !== '' && v !== false) q.set(k, String(v));
  return q.toString();
};

export const questionService = {
  list: (p: QuestionListParams) => api.get<QuestionList>(`${P}/questions?${qs({ ...p })}`),
  get: (id: string) => api.get<Question>(`${P}/questions/${id}`),
  create: (b: QuestionBody & { publish: boolean }) => api.post<Question>(`${P}/questions`, b),
  update: (id: string, b: QuestionBody) => api.put<Question>(`${P}/questions/${id}`, b),
  publish: (id: string) => api.post<Question>(`${P}/questions/${id}/publish`),
  setStatus: (id: string, status: 'draft' | 'archived') =>
    api.patch<Question>(`${P}/questions/${id}/status`, { status }),
  remove: (id: string) => api.delete<{ deleted: true }>(`${P}/questions/${id}`),
  import: (rows: QuestionImportRow[], publish: boolean) =>
    api.post<QuestionImportResult>(`${P}/questions/import`, { rows, publish }),
};

export const examService = {
  list: (p: ExamListParams) =>
    api.get<ExamList & { counts?: Record<ExamState, number> }>(`${P}/exams?${qs({ ...p })}`),
  get: (id: string) => api.get<Exam>(`${P}/exams/${id}`),
  create: (b: ExamBody) => api.post<Exam>(`${P}/exams`, b),
  update: (id: string, b: Partial<ExamBody>) => api.patch<Exam>(`${P}/exams/${id}`, b),
  setQuestions: (id: string, questionIds: string[]) =>
    api.put<Exam>(`${P}/exams/${id}/questions`, { questionIds }),
  setAssignments: (id: string, targets: Array<Pick<Assignment, 'targetType' | 'targetId'>>) =>
    api.put<Exam>(`${P}/exams/${id}/assignments`, { targets }),
  publish: (id: string) => api.post<Exam>(`${P}/exams/${id}/publish`),
  unpublish: (id: string) => api.post<Exam>(`${P}/exams/${id}/unpublish`),
  duplicate: (id: string) => api.post<Exam>(`${P}/exams/${id}/duplicate`),
  remove: (id: string) => api.delete<{ deleted: true }>(`${P}/exams/${id}`),
};

export const attemptService = {
  available: () => api.get<{ items: AvailableExam[] }>(`${P}/student/exams`),
  start: (examId: string) => api.post<AttemptMeta>(`${P}/exams/${examId}/start`),
  paper: (attemptId: string) => api.get<Paper>(`${P}/attempts/${attemptId}`),
  save: (attemptId: string, questionId: string, optionId: string | null, flagged: boolean) =>
    api.post<{ saved: true; serverTime: string }>(`${P}/attempts/${attemptId}/answers`, {
      questionId,
      optionId,
      flagged,
    }),
  submit: (attemptId: string) => api.post<SubmitResponse>(`${P}/attempts/${attemptId}/submit`),
  myResults: () => api.get<{ items: MyResult[] }>(`${P}/student/results`),
  review: (attemptId: string) => api.get<Review>(`${P}/attempts/${attemptId}/review`),
};

export const insightService = {
  results: (p: {
    page: number;
    pageSize: number;
    examId?: string;
    status?: string;
    search?: string;
  }) => api.get<ResultList>(`${P}/results?${qs(p)}`),
  result: (id: string) => api.get<ResultDetail>(`${P}/results/${id}`),
  leaderboard: (scope: LeaderboardScope, scopeId?: string) =>
    api.get<{ items: LeaderboardRow[] }>(
      `${P}/leaderboards?${qs({ scope, scopeId, pageSize: 100 })}`,
    ),
  examPerformance: () => api.get<{ items: ExamPerformance[] }>(`${P}/reports/exam-performance`),
  questionPerformance: (examId: string) =>
    api.get<{ items: QuestionPerformance[] }>(
      `${P}/reports/question-performance?${qs({ examId })}`,
    ),
  studentPerformance: (search?: string) =>
    api.get<{ items: StudentPerformance[] }>(`${P}/reports/student-performance?${qs({ search })}`),
  overview: (f: OverviewFilter) =>
    api.get<Overview>(`${P}/organizations/current/overview?${qs({ ...f })}`),
};
