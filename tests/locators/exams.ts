// Locators for /org/exams (prototype vExams) and the exam page header actions. Same names as docs/locators.md.
import { tid } from './tid';

export const ExamsPage = {
  root: tid('page-exams'),
  addBtn: tid('exams-add-btn'),
  searchInput: tid('exams-search-input'),
  /** draft | published | closed; the count is tab(name) + '-count'. */
  tab: (state: string) => tid(`exams-tab-${state}`),
  tabCount: (state: string) => tid(`exams-tab-${state}-count`),
  list: tid('exams-list'),
  empty: tid('exams-empty'),
  /** data-entity-id, data-entity-code, data-state draft | published | closed. */
  row: tid('exam-row'),
  rowOpenLink: tid('exam-row-open-btn'),
  rowEditBtn: tid('exam-row-edit-btn'),
  rowDeleteBtn: tid('exam-row-delete-btn'),
  rowViewBtn: tid('exam-row-view-btn'),
  rowUnpublishBtn: tid('exam-row-unpublish-btn'),
  rowLockedBadge: tid('exam-row-locked-badge'),
  rowDuplicateBtn: tid('exam-row-duplicate-btn'),
  deleteConfirm: tid('exams-delete-confirm'),
  deleteConfirmBtn: tid('exams-delete-confirm-btn'),
  unpublishConfirm: tid('exams-unpublish-confirm'),
  unpublishConfirmBtn: tid('exams-unpublish-confirm-btn'),
} as const;

export const ExamPage = {
  publishBtn: tid('exam-publish-btn'),
  unpublishBtn: tid('exam-unpublish-btn'),
  duplicateBtn: tid('exam-duplicate-btn'),
  deleteBtn: tid('exam-delete-btn'),
  checklist: tid('exam-checklist'),
} as const;
