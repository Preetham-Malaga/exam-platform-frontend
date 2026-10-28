# Locators (data-testid)

The contract between the app and test automation (Playwright, Selenium). Use these ids, not CSS classes,
`nth-child` or visible text. Code constants with the same names: `tests/locators/*.ts`.

## Rules

- Attribute `data-testid`, kept in every environment (never stripped from production builds).
- Name: kebab-case `<page>-<section>-<element>-<type>`. Types: `-btn -link -input -select -option -checkbox -radio -toggle -tab -row -cell -card -tile -badge -error -hint -toast -empty -loader -menu -menu-item -form -confirm`.
- **No pop-ups.** "Add" forms open in the page above the list; edit forms and confirmations open under their row
  (`<prefix>-row-expanded`) or next to the button that asked. Nothing has `role="dialog"`.
- Unique per page. Repeated items (rows, cards, options) share one id and identify themselves with
  `data-entity-id` (database id), `data-entity-code` (business code, when there is one) or `data-value` (options).
  Elements inside a row use static ids, so tests scope row → child.
- State lives in attributes: `data-state`, `data-status`, `data-selected`, `data-expanded`, `data-disabled`, `data-loading`.
- Every screen root is `page-<name>` with `data-ready="true"` once its data has loaded. Wait for that signal, never `sleep`.
- A form field's messages derive from the control id: `login-email-input` → `login-email-error` / `login-email-hint`,
  linked by `aria-describedby`.
- Toasts stay at least 4 s and have `toast-close-btn`.
- Never rename or remove an id without listing it in the change log below.

`npm run check:testids` (in CI) fails when an interactive element has no id or a literal id is repeated in one file.
Screens not converted yet are listed in `scripts/testid-baseline.json`; a file may only shrink there.
In e2e tests, `expectUniqueTestIds(page)` checks the rendered page.

## Shared components

These ids come from the shared components, usually from a prefix the screen passes in (`testId="exam"`).

| testid                                                    | element                                                         | type                   | notes                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `page-<name>`                                             | screen root (`PageRoot`)                                        | root                   | `data-ready="true"\|"false"`                                               |
| `<prefix>-table`                                          | `DataTable`                                                     | table                  |                                                                            |
| `<prefix>-row`                                            | table row                                                       | row                    | `data-entity-id`, `data-entity-code` (when `rowCode` is given)             |
| `<prefix>-row-<column>-cell`                              | table cell                                                      | cell                   | column = the column `key`                                                  |
| `<prefix>-sort-<column>-btn`                              | sortable header                                                 | button                 | `aria-sort` on the header cell                                             |
| `<prefix>-loader` / `-empty` / `-error`                   | table states                                                    | loader / empty / error | the loader has `data-loading="true"`                                       |
| `<prefix>-error-retry-btn`                                | retry in the error state                                        | button                 |                                                                            |
| `state-loader` / `state-empty` / `state-error`            | `LoadingState` / `EmptyState` / `ErrorState` without a `testId` |                        | defaults; converted screens pass their own                                 |
| `pagination`                                              | pagination bar                                                  | nav                    | `data-page`, `data-total-pages`; prefix via `testId`                       |
| `pagination-summary` / `-prev-btn` / `-next-btn`          |                                                                 | text / button / button | prev/next are disabled at the edges                                        |
| `search-input`                                            | `SearchInput`                                                   | input                  | `name="search"`; screens pass e.g. `exams-search-input`                    |
| `filter-clear-btn`                                        | `FilterBar` clear button                                        | button                 | only shown when filters are set                                            |
| `<prefix>-tab-<id>`                                       | `Tabs` button                                                   | tab                    | `data-selected`; default prefix `tabs`                                     |
| `<prefix>-tab-panel`                                      | active tab panel                                                | panel                  | `data-tab="<id>"`                                                          |
| `<prefix>-menu-btn`                                       | `Dropdown` trigger                                              | button                 | `data-expanded`; prefix defaults to the menu label                         |
| `<prefix>-menu`                                           | open menu                                                       | menu                   |                                                                            |
| `<prefix>-<label>-menu-item`                              | menu item                                                       | menu-item              | or the item's own `testId`; `data-disabled`                                |
| `<prefix>-row-expanded`                                   | area under a row (inline edit form / confirmation)              | row                    | `data-entity-id` = the row's id; the row gets `data-expanded`              |
| `<testId>` (e.g. `course-form`)                           | `InlinePanel`: form or detail shown in the page                 | form                   | role region named by its title; `<testId>-close-btn`; Esc closes           |
| `<prefix>-confirm`                                        | `InlineConfirm` (e.g. `course-delete-confirm`)                  | confirm                | role group named by its question; `data-state` danger/primary; Esc cancels |
| `row-actions-menu-btn` / `row-actions-<action>-menu-item` | the ⋯ menu inside each row                                      | button / menu-item     | static ids, scope them by the row                                          |
| `<prefix>-cancel-btn` / `<prefix>-confirm-btn`            | confirm buttons                                                 | button                 |                                                                            |
| `toast-region`                                            | live region                                                     | region                 |                                                                            |
| `toast-success` / `-error` / `-info` / `-warning`         | toast                                                           | toast                  | `data-state` = variant; stays ≥ 4 s                                        |
| `toast-title` / `toast-description` / `toast-close-btn`   | toast parts                                                     | text / text / button   |                                                                            |
| `<field>-error` / `<field>-hint`                          | form field messages                                             | error / hint           | derived from the control id                                                |
| `<field>-toggle-btn`                                      | `PasswordInput` show/hide                                       | button                 | `aria-pressed`                                                             |
| `<field>-option`                                          | `Select` options                                                | option                 | `data-value`                                                               |

## App shell

Constants: `AppShell`, `NavLinks` in `tests/locators/shell.ts`.

| testid                                                                 | element                                                           | type                    | notes                                                                                                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nav`                                                                  | sidebar navigation                                                | nav                     | desktop sidebar or the mobile drawer                                                                                                             |
| `nav-dashboard-link`                                                   | Dashboard (not in a group)                                        | link                    | active link has `aria-current="page"`                                                                                                            |
| `nav-<group>-group-btn`                                                | menu group: `syllabus`, `exams`, `people`, `insights`, `settings` | button                  | `aria-expanded` / `data-expanded`; the group holding the current page is always open (button disabled)                                           |
| `nav-<group>-<page>-link`                                              | link inside a group                                               | link                    | e.g. `nav-people-students-link`, `nav-exams-published-link`, `nav-settings-permissions-link` (a leading group name in the route is not repeated) |
| `nav-mobile-menu`                                                      | menu under the topbar                                             | nav                     | below 1024 px, opened by `topbar-nav-toggle-btn` (`aria-expanded`); Esc closes                                                                   |
| `topbar-nav-toggle-btn`                                                | menu toggle                                                       | button                  | collapses the sidebar / opens the drawer                                                                                                         |
| `topbar-user-name` / `topbar-user-email`                               | signed-in user                                                    | text                    | hidden below 640 px                                                                                                                              |
| `topbar-account-menu-btn` / `topbar-account-menu`                      | account menu                                                      | button / menu           |                                                                                                                                                  |
| `topbar-account-signout-menu-item`                                     | Sign out                                                          | menu-item               |                                                                                                                                                  |
| `skip-to-content-link`                                                 | skip link                                                         | link                    | visible on keyboard focus                                                                                                                        |
| `breadcrumb` / `breadcrumb-link`                                       | breadcrumb                                                        | nav / link              | links carry `data-to`                                                                                                                            |
| `access-denied` / `access-denied-home-link`                            | no-permission screen                                              | alert / link            |                                                                                                                                                  |
| `account-load-error` / `-retry-btn` / `account-load-error-signout-btn` | account could not load                                            | error / button / button |                                                                                                                                                  |

## Login (`/login`)

Constants: `LoginPage` in `tests/locators/login.ts`.

| testid                                          | element                | type          | notes                                        |
| ----------------------------------------------- | ---------------------- | ------------- | -------------------------------------------- |
| `page-login`                                    | screen root            | root          | always `data-ready="true"` (no data to load) |
| `login-form`                                    | form                   | form          |                                              |
| `login-email-input` / `login-email-error`       | e-mail                 | input / error | `name="email"`                               |
| `login-password-input` / `login-password-error` | password               | input / error | `name="password"`                            |
| `login-password-toggle-btn`                     | show/hide password     | button        | `aria-pressed`                               |
| `login-remember-checkbox`                       | Remember me            | checkbox      | `name="remember"`                            |
| `login-forgot-password-link`                    | Forgot password?       | link          | `/forgot-password`                           |
| `login-error`                                   | form error             | error         | wrong password, unverified, rate limited     |
| `login-session-expired-hint`                    | session expired notice | hint          |                                              |
| `login-resend-verification-btn`                 | resend verification    | button        | only after "email not verified"              |
| `login-submit-btn`                              | Login                  | button        | `data-loading` while signing in              |
| `login-google-btn`                              | Continue with Google   | button        |                                              |
| `login-signup-link`                             | Sign up                | link          | `/register`                                  |

## Inline forms and confirmations per screen

Each table uses `testId=<entity>`: rows are `<entity>-row` with `data-entity-id` (and `data-entity-code` where shown).

| screen                      | add / edit form                                                                                                                                                                    | fields (`<form>-<field>-input/-select/-textarea/-checkbox`)                                                                                                                     | confirmation                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Courses                     | `courses-add-btn` → `course-form`                                                                                                                                                  | name, code, unit, status, description; `course-form-save-btn` / `-cancel-btn`                                                                                                   | `course-delete-confirm`                                                                    |
| Subjects                    | `subjects-add-btn` → `subject-form`                                                                                                                                                | name, code, course, unit, status, description                                                                                                                                   | `subject-delete-confirm`                                                                   |
| Topics                      | `topics-add-btn` → `topic-form`                                                                                                                                                    | subject, name                                                                                                                                                                   | `topic-delete-confirm`                                                                     |
| Academic Structure – levels | `level-add-form` (always shown)                                                                                                                                                    | `level-add-name-input`, `level-add-btn`; rows `level-row` with up/down/rename/delete buttons; `level-rename-form`                                                               | `level-delete-confirm`                                                                     |
| Academic Structure – units  | `unit-add-top-level-btn` → `unit-form` (top), `unit-node-add-btn` / `unit-node-edit-btn` → `unit-form` under the node                                                              | level, name, code, status                                                                                                                                                       | `unit-delete-confirm`                                                                      |
| Students                    | `students-add-btn` → `student-form`; `students-import-btn` → `student-import`                                                                                                      | name, roll-number, unit, email, phone, status, invite; import: file input, check / submit buttons, `student-import-result`                                                      | `student-remove-confirm`                                                                   |
| Teachers                    | `teachers-add-btn` → `teacher-form`; row menu "Assign scope" → `teacher-scope`                                                                                                     | name, employee-code, email, phone, status, invite; scope: `teacher-scope-<type>-checkbox` (`data-value`)                                                                        | `teacher-remove-confirm`                                                                   |
| Users                       | `users-invite-admin-btn` → `admin-invite-form`                                                                                                                                     | name, email; `admin-invite-form-send-btn`                                                                                                                                       | `user-role-confirm`, `user-status-confirm`                                                 |
| Question Bank               | `questions-add-btn` → `question-editor` (edit: under the row)                                                                                                                      | subject, topic, type, difficulty, text, `question-editor-option-input-N`, `-option-correct-radio-N`, marks, negative-marks, explanation; `-save-draft-btn`, `-save-publish-btn` | `question-delete-confirm`                                                                  |
| Exams                       | `exams-add-btn` → `exam-form`                                                                                                                                                      | (exam fields); rows `exam-row`, `exam-row-open-btn`                                                                                                                             | —                                                                                          |
| Exam page                   | `exam-publish-btn`, `exam-unpublish-btn`, `exam-delete-btn`, tabs `exam-tab-<id>`                                                                                                  | `exam-details-save-btn`, `exam-checklist`                                                                                                                                       | `exam-publish-confirm` / `exam-unpublish-confirm` / `exam-delete-confirm` under the header |
| Results                     | `result-row-view-btn` → `result-detail` under the row                                                                                                                              | `result-detail-answer` (`data-state` correct/wrong/unanswered)                                                                                                                  | —                                                                                          |
| Student – My Exams          | cards `student-exam-card` (`data-state` open/in-progress/no-attempts), `-start-btn`, `-resume-btn`                                                                                 |                                                                                                                                                                                 | `student-exam-start-confirm` inside the card                                               |
| Student – exam runner       | `page-exam-runner`; `exam-runner-option` (`data-selected`), `-next-btn`, `-prev-btn`, `-finish-btn`, `-palette-btn` (`data-state`), `exam-runner-timer` (`data-remaining-seconds`) |                                                                                                                                                                                 | `exam-runner-submit-confirm` in the side panel                                             |

## Not converted yet

Registration, password reset, organization profile, assignments, reports, dashboards and the platform area
still use the shared-component defaults only. Each gets its ids, a `page-<name>` root and its section here in
the phase that works on it. `npm run check:testids -- --list` shows what is left.

## Change log

| date       | change                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-28 | Foundation: ids added to all shared components, the app shell and the login screen. Nothing renamed or removed (the existing `dialog-overlay` is kept).                                                                                                                                                                                                                                                                                                   |
| 2026-10-28 | No pop-ups: Modal / Drawer / ConfirmDialog replaced by inline forms and confirmations. **Removed:** `dialog`, `dialog-overlay`, `<x>-dialog`, `<x>-dialog-close-btn`, `nav-drawer`, `nav-drawer-close-btn`. **Replaced by:** `<form id>` + `<form id>-close-btn`, `<prefix>-confirm`, `<prefix>-row-expanded`, `nav-mobile-menu`. Row menus now use static `row-actions-*` ids (were derived from the row's name). Ids added to the screens listed above. |
| 2026-10-28 | New menu: collapsible groups Syllabus, Exams, People, Insights, Settings; Academic Structure removed from the menu. **Changed:** sidebar links `nav-<page>-link` → `nav-<group>-<page>-link` (Dashboard unchanged); **added** `nav-<group>-group-btn`, `nav-<group>-group`.                                                                                                                                                                               |
