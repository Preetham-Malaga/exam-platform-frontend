// Locators for /org/batches (prototype vBatches) and the batch form page. Same names as docs/locators.md.
import { formPage } from './courses';
import { tid } from './tid';

export const BatchesPage = {
  root: tid('page-batches'),
  addBtn: tid('batches-add-btn'),
  addTileBtn: tid('batches-add-tile-btn'),
  summary: tid('batches-summary'),
  noBatchWarning: tid('batches-no-batch-warning'),
  noBatchLink: tid('batches-no-batch-link'),
  /** data-entity-id, data-entity-code, data-state active | inactive. */
  tile: tid('batch-tile'),
  tileStudentsLink: tid('batch-tile-students-link'),
  tileEditBtn: tid('batch-tile-edit-btn'),
  tileDeleteBtn: tid('batch-tile-delete-btn'),
  deleteConfirm: tid('batches-delete-confirm'),
  deleteConfirmBtn: tid('batches-delete-confirm-btn'),
} as const;

export const BatchForm = {
  root: tid('page-form-batch'),
  ...formPage('batch-form'),
  nameInput: tid('batch-form-name-input'),
  codeInput: tid('batch-form-code-input'),
  courseSelect: tid('batch-form-course-select'),
  academicYearSelect: tid('batch-form-academic-year-select'),
  yearSemSelect: tid('batch-form-year-sem-select'),
  sectionInput: tid('batch-form-section-input'),
  modeRadio: tid('batch-form-mode-radio'),
  timingSelect: tid('batch-form-timing-select'),
  startDateInput: tid('batch-form-start-date-input'),
  endDateInput: tid('batch-form-end-date-input'),
  capacityInput: tid('batch-form-capacity-input'),
  classTeacherSelect: tid('batch-form-class-teacher-select'),
  roomInput: tid('batch-form-room-input'),
  statusRadio: tid('batch-form-status-radio'),
} as const;

/** Batch bits on the Students screen. */
export const StudentBatch = {
  filterSelect: tid('students-filter-batch-select'),
  noBatchBadge: tid('student-row-no-batch-badge'),
  formSelect: tid('student-form-batch-select'),
} as const;
