// Locators for /org/questions (prototype vQBDrill) and /org/questions/import. Same names as docs/locators.md.
import { tid } from './tid';

export const QuestionBankPage = {
  root: tid('page-questions'),
  newBtn: tid('questions-new-btn'),
  importBtn: tid('questions-import-btn'),
  courseCard: tid('questions-course-card'),
  newCard: tid('questions-new-card'),
  allCoursesBtn: tid('questions-all-courses-btn'),
  subjectTab: tid('questions-subject-tab'),
  diffChip: tid('questions-filter-diff-chip'),
  card: tid('questions-card'),
  cardOptionsBtn: tid('questions-card-options-btn'),
  cardEditBtn: tid('questions-card-edit-btn'),
  cardPublishBtn: tid('questions-card-publish-btn'),
  cardDraftBtn: tid('questions-card-draft-btn'),
  cardDeleteBtn: tid('questions-card-delete-btn'),
  deleteConfirm: tid('questions-delete-confirm'),
  deleteConfirmBtn: tid('questions-delete-confirm-btn'),
  option: tid('question-option'),
  empty: tid('questions-empty'),
} as const;

export const QuestionImportPage = {
  root: tid('page-questions-import'),
  fileInput: tid('questions-import-file-input'),
  templateLink: tid('questions-import-template-link'),
  fileError: tid('questions-import-file-error'),
  summary: tid('questions-import-summary'),
  previewRow: tid('questions-import-preview-row'),
  publishCheckbox: tid('questions-import-publish-checkbox'),
  confirmBtn: tid('questions-import-confirm-btn'),
  cancelBtn: tid('questions-import-cancel-btn'),
  result: tid('questions-import-result'),
} as const;
