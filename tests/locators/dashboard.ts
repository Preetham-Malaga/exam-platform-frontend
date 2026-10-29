// Locators for /org/dashboard (prototype vDashOwner). Same names as docs/locators.md → "Dashboard".
import { tid } from './tid';

export const DashboardPage = {
  root: tid('page-dashboard'),
  downloadPdfBtn: tid('dashboard-download-pdf-btn'),
  createExamBtn: tid('dashboard-create-exam-btn'),
  filters: tid('dashboard-filters'),
  rangeSelect: tid('dashboard-filter-date-range-select'),
  batchSelect: tid('dashboard-filter-batch-select'),
  courseSelect: tid('dashboard-filter-course-select'),
  examSelect: tid('dashboard-filter-exam-select'),
  resetBtn: tid('dashboard-filter-reset-btn'),
  /** students, exams-open, results, avg-score, pass-rate, live-today; value: tile(name) + '-value'. */
  tile: (name: string) => tid(`dashboard-tile-${name}`),
  tileValue: (name: string) => tid(`dashboard-tile-${name}-value`),
  flow: tid('dashboard-flow'),
  /** courses, questions, exams, students, results. */
  stage: (name: string) => tid(`dashboard-stage-${name}`),
  stageValue: (name: string) => tid(`dashboard-stage-${name}-value`),
  stageStatus: (name: string) => tid(`dashboard-stage-${name}-status`),
  chart: tid('dashboard-results-chart'),
  chartBar: tid('dashboard-results-chart-bar'),
  attention: tid('dashboard-attention'),
  attentionRow: tid('dashboard-attention-row'),
  exams: tid('dashboard-exams'),
  examRow: tid('dashboard-exam-row'),
  examRowLink: tid('dashboard-exam-row-link'),
  today: tid('dashboard-today'),
  todayRow: tid('dashboard-today-row'),
  todayClosingRow: tid('dashboard-today-closing-row'),
  teacherRow: tid('dashboard-teacher-row'),
  topRow: tid('dashboard-top-row'),
  recentResults: tid('dashboard-recent-results'),
  resultRow: tid('result-row'),
} as const;

/** Own-route add pages: page roots. The form inside keeps its screen's ids (student-form, exam-form …). */
export const AddPages = {
  question: tid('page-form-question'),
  exam: tid('page-form-exam'),
  student: tid('page-form-student'),
  teacher: tid('page-form-teacher'),
  admin: tid('page-form-admin'),
} as const;
