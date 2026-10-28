// Locators shared by every screen: toasts, generic states, confirm dialogs, pagination, search, filters.
// Same names as docs/locators.md → "Shared components". Prefixed ids (exam-row, exams-loader) are built with the helpers.
import { tid } from './tid';

export const Toast = {
  region: tid('toast-region'),
  success: tid('toast-success'),
  error: tid('toast-error'),
  info: tid('toast-info'),
  warning: tid('toast-warning'),
  title: tid('toast-title'),
  description: tid('toast-description'),
  closeBtn: tid('toast-close-btn'),
} as const;

export const States = {
  loader: tid('state-loader'),
  empty: tid('state-empty'),
  error: tid('state-error'),
  errorRetryBtn: tid('state-error-retry-btn'),
} as const;

export const Pagination = {
  root: tid('pagination'),
  summary: tid('pagination-summary'),
  prevBtn: tid('pagination-prev-btn'),
  nextBtn: tid('pagination-next-btn'),
} as const;

export const Filters = {
  searchInput: tid('search-input'),
  clearBtn: tid('filter-clear-btn'),
} as const;

/** DataTable with testId="<prefix>": its table, rows, cells and states. */
export const table = (prefix: string) => ({
  table: tid(`${prefix}-table`),
  row: tid(`${prefix}-row`),
  cell: (column: string) => tid(`${prefix}-row-${column}-cell`),
  sortBtn: (column: string) => tid(`${prefix}-sort-${column}-btn`),
  loader: tid(`${prefix}-loader`),
  empty: tid(`${prefix}-empty`),
  error: tid(`${prefix}-error`),
  retryBtn: tid(`${prefix}-error-retry-btn`),
});

/** ConfirmDialog with testId="<prefix>". */
export const confirmDialog = (prefix = 'confirm') => ({
  root: tid(`${prefix}-dialog`),
  closeBtn: tid(`${prefix}-dialog-close-btn`),
  cancelBtn: tid(`${prefix}-cancel-btn`),
  confirmBtn: tid(`${prefix}-confirm-btn`),
});
