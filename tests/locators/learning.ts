// Locators for Learning: /…/live, /…/recorded, /…/materials and their form pages. Same names as docs/locators.md.
import { formPage } from './courses';
import { tid } from './tid';

export const LivePage = {
  root: tid('page-live'),
  scheduleBtn: tid('live-schedule-btn'),
  /** today | upcoming | past */
  tab: (when: string) => tid(`live-tab-${when}`),
  list: tid('live-list'),
  empty: tid('live-empty'),
  /** data-entity-id, data-state live | upcoming | past | cancelled */
  row: tid('live-row'),
  liveBadge: tid('live-row-live-badge'),
  /** data-state open | not-yet */
  joinBtn: tid('live-row-join-btn'),
  copyLinkBtn: tid('live-row-copy-link-btn'),
  addRecordingBtn: tid('live-row-add-recording-btn'),
  recordingLink: tid('live-row-recording-link'),
  editBtn: tid('live-classes-row-edit-btn'),
  deleteBtn: tid('live-classes-row-delete-btn'),
  deleteConfirmBtn: tid('live-classes-delete-confirm-btn'),
} as const;

export const RecordedPage = {
  root: tid('page-recorded'),
  addBtn: tid('recorded-add-btn'),
  grid: tid('recorded-grid'),
  empty: tid('recorded-empty'),
  card: tid('recorded-card'),
  watchBtn: tid('recorded-card-watch-btn'),
  editBtn: tid('recordings-row-edit-btn'),
  deleteBtn: tid('recordings-row-delete-btn'),
  deleteConfirmBtn: tid('recordings-delete-confirm-btn'),
} as const;

export const MaterialsPage = {
  root: tid('page-materials'),
  addBtn: tid('materials-add-btn'),
  empty: tid('materials-empty'),
  subjectGroup: tid('materials-subject-group'),
  row: tid('material-row'),
  openBtn: tid('material-row-open-btn'),
  viewOnlyBadge: tid('material-row-view-only-badge'),
  editBtn: tid('materials-row-edit-btn'),
  deleteBtn: tid('materials-row-delete-btn'),
  deleteConfirmBtn: tid('materials-delete-confirm-btn'),
} as const;

export const LiveForm = { root: tid('page-form-live'), ...formPage('live-form') } as const;
export const RecordingForm = {
  root: tid('page-form-recorded'),
  ...formPage('recorded-form'),
} as const;
export const MaterialForm = {
  root: tid('page-form-materials'),
  ...formPage('materials-form'),
} as const;
