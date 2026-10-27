// PURPOSE: TanStack Query hooks for questions, exams, the student exam engine and insights.
// WHY: One cache root ('assessment'): publishing a question, changing an exam or submitting an attempt changes counts
//      shown on several screens (exam lists, results, dashboard), so every change refreshes them all.
// DEPENDS ON: services/assessmentService.ts.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attemptService,
  examService,
  insightService,
  questionService,
} from '@/services/assessmentService';
import type { ExamListParams, LeaderboardScope, QuestionListParams } from '@/types/assessment';

export const assessmentKey = ['assessment'] as const;
const k = (...parts: unknown[]) => [...assessmentKey, ...parts];

export const useQuestions = (p: QuestionListParams, enabled = true) =>
  useQuery({
    queryKey: k('questions', p),
    queryFn: () => questionService.list(p),
    placeholderData: keepPreviousData,
    enabled,
  });
export const useQuestion = (id: string | null) =>
  useQuery({
    queryKey: k('question', id),
    queryFn: () => questionService.get(id!),
    enabled: Boolean(id),
  });

export const useExams = (p: ExamListParams, enabled = true) =>
  useQuery({
    queryKey: k('exams', p),
    queryFn: () => examService.list(p),
    placeholderData: keepPreviousData,
    enabled,
  });
export const useExam = (id: string | undefined) =>
  useQuery({ queryKey: k('exam', id), queryFn: () => examService.get(id!), enabled: Boolean(id) });

export const useAvailableExams = () =>
  useQuery({ queryKey: k('available'), queryFn: attemptService.available });
export const usePaper = (attemptId: string | undefined) =>
  useQuery({
    queryKey: k('paper', attemptId),
    queryFn: () => attemptService.paper(attemptId!),
    enabled: Boolean(attemptId),
    refetchOnWindowFocus: false, // answers live in local state while the paper is open
  });
export const useMyResults = () =>
  useQuery({ queryKey: k('myResults'), queryFn: attemptService.myResults });
export const useReview = (attemptId: string | undefined) =>
  useQuery({
    queryKey: k('review', attemptId),
    queryFn: () => attemptService.review(attemptId!),
    enabled: Boolean(attemptId),
  });

export const useResults = (p: Parameters<typeof insightService.results>[0]) =>
  useQuery({
    queryKey: k('results', p),
    queryFn: () => insightService.results(p),
    placeholderData: keepPreviousData,
  });
export const useResult = (id: string | null) =>
  useQuery({
    queryKey: k('result', id),
    queryFn: () => insightService.result(id!),
    enabled: Boolean(id),
  });
export const useLeaderboard = (scope: LeaderboardScope, scopeId?: string) =>
  useQuery({
    queryKey: k('leaderboard', scope, scopeId),
    queryFn: () => insightService.leaderboard(scope, scopeId),
    enabled: scope === 'organization' || Boolean(scopeId),
  });
export const useExamPerformance = () =>
  useQuery({ queryKey: k('report', 'exam'), queryFn: insightService.examPerformance });
export const useQuestionPerformance = (examId: string) =>
  useQuery({
    queryKey: k('report', 'question', examId),
    queryFn: () => insightService.questionPerformance(examId),
    enabled: Boolean(examId),
  });
export const useStudentPerformance = (search: string) =>
  useQuery({
    queryKey: k('report', 'student', search),
    queryFn: () => insightService.studentPerformance(search || undefined),
  });
export const useDashboard = () =>
  useQuery({ queryKey: k('dashboard'), queryFn: insightService.dashboard });

/** A mutation that refreshes every assessment query when it succeeds. */
export function useAssessmentMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: assessmentKey }),
  });
}
