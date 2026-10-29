// PURPOSE: Shape of GET /organizations/current/overview (the owner dashboard, prototype vDashOwner).
// WHY: The dashboard page, its hook and tests share one definition that mirrors the backend response.
// DEPENDS ON: nothing.

export type OverviewRange = 'today' | '7' | '30' | 'month';
export interface OverviewFilter {
  range: OverviewRange;
  batch?: string;
  course?: string;
  exam?: string;
}
export type ExamState = 'draft' | 'published' | 'closed';

export interface OverviewExam {
  id: string;
  name: string;
  code: string;
  state: ExamState;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number;
  courseName: string | null;
  questionCount: number;
  assignmentCount: number;
  students: number;
  attempts: number;
  averagePercentage: number | null;
}
export interface OverviewResult {
  id: string;
  studentName: string;
  rollNumber: string;
  examName: string;
  percentage: number;
  status?: string;
  evaluatedAt?: string;
}

export interface Overview {
  filter: OverviewFilter;
  timezone: string;
  headline: {
    students: number;
    batches: number;
    examsOpen: number;
    examsDraft: number;
    results: number;
    attempts: number;
    averagePercentage: number | null;
    passed: number;
    passRate: number | null;
    liveToday: number | null;
  };
  flow: {
    courses: { courses: number; subjects: number; topics: number; subjectsWithoutTopics: number };
    questions: {
      total: number;
      published: number;
      draft: number;
      easy: number;
      medium: number;
      hard: number;
    };
    exams: { open: number; draft: number; closed: number; attempts: number };
    students: {
      students: number;
      batches: number;
      teachers: number;
      notInvited: number;
      noBatch: number;
    };
    results: {
      results: number;
      averagePercentage: number | null;
      passRate: number | null;
      belowPass: number;
    };
  };
  perDay: Array<{ day: string; results: number }>;
  exams: OverviewExam[];
  recentResults: OverviewResult[];
  topStudents: OverviewResult[];
  teachers: Array<{ id: string; name: string; email: string | null; hasLogin: boolean }>;
}
