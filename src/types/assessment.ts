// PURPOSE: TypeScript shapes for the question bank, exams, the student exam engine, results, reports and the dashboard.
// WHY: Services, hooks and pages share one definition; it mirrors the backend responses (openapi/openapi.yaml).
// DEPENDS ON: types/api.ts.

import type { Paginated } from './api';

// ---------- question bank ----------
export type QuestionType = 'multiple_choice' | 'true_false';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'published' | 'archived';

export interface QuestionSummary {
  id: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  questionType: QuestionType;
  questionText: string;
  difficulty: Difficulty;
  marks: number;
  negativeMarks: number;
  status: QuestionStatus;
  ownerType: 'organization' | 'teacher';
  createdByName: string;
  createdBy: string | null;
  examCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface Question extends QuestionSummary {
  explanation: string | null;
  options: Array<{ id: string; text: string; position: number }>;
  correctOptionId: string | null;
}
export interface QuestionBody {
  subjectId: string;
  topicId: string | null;
  questionType: QuestionType;
  questionText: string;
  difficulty: Difficulty;
  marks: number;
  negativeMarks: number;
  explanation: string | null;
  options: string[];
  correctOption: number;
}
export interface QuestionListParams {
  page: number;
  pageSize: number;
  search?: string;
  courseId?: string;
  subjectId?: string;
  topicId?: string;
  status?: QuestionStatus;
  difficulty?: Difficulty;
  questionType?: QuestionType;
  sort?: string;
  order?: 'asc' | 'desc';
}
export type QuestionList = Paginated<QuestionSummary>;

// ---------- exams ----------
export type ExamStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export interface ExamSettings {
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showResults: boolean;
  showAnswers: boolean;
  leaderboardEnabled: boolean;
}
/** Prototype tabs: draft (draft or unpublished), published (open or upcoming), closed (window over or archived). */
export type ExamState = 'draft' | 'published' | 'closed';
export interface ExamSummary {
  id: string;
  examCode: string;
  name: string;
  description: string | null;
  status: ExamStatus;
  state?: ExamState;
  courseId: string | null;
  courseName: string | null;
  durationMinutes: number;
  passingPercentage: number;
  startAt: string | null;
  endAt: string | null;
  questionCount: number;
  totalMarks: number;
  assignmentCount: number;
  attemptCount: number;
  createdByName: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
export type TargetType = 'organization' | 'academic_unit' | 'subject' | 'student';
export interface ExamQuestion {
  questionId: string;
  position: number;
  marks: number;
  negativeMarks: number;
  questionText: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  status: QuestionStatus;
  subjectName: string;
}
export interface Assignment {
  targetType: TargetType;
  targetId: string;
  targetName: string | null;
}
export interface Exam extends ExamSummary {
  settings: ExamSettings | null;
  questions: ExamQuestion[];
  assignments: Assignment[];
}
export interface ExamBody {
  name: string;
  examCode: string;
  description: string | null;
  courseId: string | null;
  durationMinutes: number;
  passingPercentage: number;
  startAt: string | null;
  endAt: string | null;
  settings: ExamSettings;
}
export interface ExamListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: ExamStatus;
  state?: ExamState;
  sort?: string;
  order?: 'asc' | 'desc';
}
export type ExamList = Paginated<ExamSummary>;

// ---------- student exam engine ----------
export interface AvailableExam {
  examId: string;
  examCode: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  passingPercentage: number;
  startAt: string | null;
  endAt: string | null;
  maxAttempts: number;
  attemptsUsed: number;
  runningAttemptId: string | null;
  showResults: boolean;
  leaderboardEnabled: boolean;
  questionCount: number;
  totalMarks: number;
}
export interface AttemptMeta {
  attemptId: string;
  examId: string;
  attemptNo: number;
  status: 'in_progress' | 'submitted';
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  autoSubmitted: boolean;
  serverTime: string;
}
export interface PaperQuestion {
  id: string;
  text: string;
  type: QuestionType;
  marks: number;
  negativeMarks: number;
  options: Array<{ id: string; text: string }>;
}
export interface Paper extends AttemptMeta {
  examName: string;
  durationMinutes: number;
  instructions?: string;
  questions?: PaperQuestion[];
  answers?: Array<{ questionId: string; selectedOptionId: string | null; flagged: boolean }>;
}
export interface ResultSummary {
  resultId: string;
  attemptId: string;
  examId: string;
  score: number;
  maximumScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  durationSeconds: number;
  status: 'Passed' | 'Failed' | 'Pending';
  evaluatedAt: string;
}
export interface SubmitResponse {
  submitted: true;
  result: ResultSummary | null;
  resultsHidden?: boolean;
}
export interface MyResult extends ResultSummary {
  examName: string;
  showAnswers: boolean;
  leaderboardEnabled: boolean;
}
export interface ReviewItem {
  id: string;
  text: string;
  explanation: string | null;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean | null;
  marksAwarded: number;
  marks: number;
  options: Array<{ id: string; text: string }>;
}
export interface Review {
  result: ResultSummary;
  showAnswers: boolean;
  review: ReviewItem[] | null;
}

// ---------- insights ----------
export interface ResultRow {
  id: string;
  attemptId: string;
  examId: string;
  examName: string;
  examCode: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  academicUnitName: string | null;
  score: number;
  maximumScore: number;
  percentage: number;
  status: 'Passed' | 'Failed' | 'Pending';
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  durationSeconds: number;
  evaluatedAt: string;
  attemptNo: number;
  autoSubmitted: boolean;
}
export type ResultList = Paginated<ResultRow>;
export interface ResultDetail extends Omit<
  ResultRow,
  'examCode' | 'studentId' | 'academicUnitName'
> {
  startedAt: string;
  submittedAt: string | null;
  answers: Array<{
    questionId: string;
    position: number;
    questionText: string;
    marks: number;
    selectedOptionId: string | null;
    correctOptionId: string | null;
    isCorrect: boolean | null;
    marksAwarded: number;
    options: Array<{ id: string; text: string }>;
  }>;
}
export interface LeaderboardRow {
  rank: number;
  studentId: string;
  studentName: string;
  score: number;
  percentage: number;
  durationSeconds: number;
  examsTaken: number;
  isMe: boolean;
}
export type LeaderboardScope = 'exam' | 'organization' | 'academic_unit' | 'subject';
export interface ExamPerformance {
  examId: string;
  examName: string;
  examCode: string;
  status: ExamStatus;
  attempts: number;
  students: number;
  averagePercentage: number | null;
  highestPercentage: number | null;
  lowestPercentage: number | null;
  passed: number;
  failed: number;
  averageDurationSeconds: number | null;
}
export interface QuestionPerformance {
  position: number;
  questionId: string;
  questionText: string;
  difficulty: Difficulty;
  marks: number;
  attempts: number;
  answered: number;
  correct: number;
  wrong: number;
}
export interface StudentPerformance {
  studentId: string;
  studentName: string;
  rollNumber: string;
  academicUnitName: string | null;
  examsTaken: number;
  averagePercentage: number | null;
  bestPercentage: number | null;
  passed: number;
  lastResultAt: string | null;
}

/** POST /questions/import: one row per CSV line (row = line number shown back in errors). */
export interface QuestionImportRow extends QuestionBody {
  row: number;
}
export interface QuestionImportResult {
  created: number;
  errors: Array<{ row: number; message: string }>;
}
