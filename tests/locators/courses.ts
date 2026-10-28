// Locators for /org/courses. Same names as docs/locators.md → "Courses". Forms and confirmations are inline (no pop-ups).
import { table } from './common';
import { byEntity, tid } from './tid';

export const CoursesPage = {
  addBtn: tid('courses-add-btn'),
  ...table('course'),
  rowByCode: (code: string) => `${tid('course-row')}[data-entity-code="${code}"]`,
  rowById: (id: string) => byEntity('course-row', id),
  /** Area under a row holding its edit form or delete confirmation. */
  rowExpanded: (id: string) => byEntity('course-row-expanded', id),
  rowActionsBtn: tid('row-actions-menu-btn'),
  rowEditMenuItem: tid('row-actions-edit-menu-item'),
  rowDeleteMenuItem: tid('row-actions-delete-menu-item'),
  form: tid('course-form'),
  formCloseBtn: tid('course-form-close-btn'),
  nameInput: tid('course-form-name-input'),
  nameError: tid('course-form-name-error'),
  codeInput: tid('course-form-code-input'),
  codeError: tid('course-form-code-error'),
  unitSelect: tid('course-form-unit-select'),
  statusSelect: tid('course-form-status-select'),
  descriptionTextarea: tid('course-form-description-textarea'),
  cancelBtn: tid('course-form-cancel-btn'),
  saveBtn: tid('course-form-save-btn'),
  deleteConfirm: tid('course-delete-confirm'),
  deleteCancelBtn: tid('course-delete-cancel-btn'),
  deleteConfirmBtn: tid('course-delete-confirm-btn'),
} as const;
