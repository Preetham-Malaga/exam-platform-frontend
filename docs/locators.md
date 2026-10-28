# Locators (data-testid)

The contract between the app and test automation (Playwright, Selenium). Use these ids, not CSS classes,
`nth-child` or visible text. Code constants with the same names: `tests/locators/*.ts`.

## Rules

- Attribute `data-testid`, kept in every environment (never stripped from production builds).
- Name: kebab-case `<page>-<section>-<element>-<type>`. Types: `-btn -link -input -select -option -checkbox -radio -toggle -tab -row -cell -card -tile -badge -error -hint -toast -empty -loader -menu -menu-item -dialog -confirm`.
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

| testid                                                  | element                                                         | type                   | notes                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| `page-<name>`                                           | screen root (`PageRoot`)                                        | root                   | `data-ready="true"\|"false"`                                   |
| `<prefix>-table`                                        | `DataTable`                                                     | table                  |                                                                |
| `<prefix>-row`                                          | table row                                                       | row                    | `data-entity-id`, `data-entity-code` (when `rowCode` is given) |
| `<prefix>-row-<column>-cell`                            | table cell                                                      | cell                   | column = the column `key`                                      |
| `<prefix>-sort-<column>-btn`                            | sortable header                                                 | button                 | `aria-sort` on the header cell                                 |
| `<prefix>-loader` / `-empty` / `-error`                 | table states                                                    | loader / empty / error | the loader has `data-loading="true"`                           |
| `<prefix>-error-retry-btn`                              | retry in the error state                                        | button                 |                                                                |
| `state-loader` / `state-empty` / `state-error`          | `LoadingState` / `EmptyState` / `ErrorState` without a `testId` |                        | defaults; converted screens pass their own                     |
| `pagination`                                            | pagination bar                                                  | nav                    | `data-page`, `data-total-pages`; prefix via `testId`           |
| `pagination-summary` / `-prev-btn` / `-next-btn`        |                                                                 | text / button / button | prev/next are disabled at the edges                            |
| `search-input`                                          | `SearchInput`                                                   | input                  | `name="search"`; screens pass e.g. `exams-search-input`        |
| `filter-clear-btn`                                      | `FilterBar` clear button                                        | button                 | only shown when filters are set                                |
| `<prefix>-tab-<id>`                                     | `Tabs` button                                                   | tab                    | `data-selected`; default prefix `tabs`                         |
| `<prefix>-tab-panel`                                    | active tab panel                                                | panel                  | `data-tab="<id>"`                                              |
| `<prefix>-menu-btn`                                     | `Dropdown` trigger                                              | button                 | `data-expanded`; prefix defaults to the menu label             |
| `<prefix>-menu`                                         | open menu                                                       | menu                   |                                                                |
| `<prefix>-<label>-menu-item`                            | menu item                                                       | menu-item              | or the item's own `testId`; `data-disabled`                    |
| `dialog` / `<testId>`                                   | `Modal` / `Drawer` panel                                        | dialog                 | `<testId>-close-btn` closes it                                 |
| `dialog-overlay`                                        | backdrop                                                        |                        |                                                                |
| `<prefix>-dialog`                                       | `ConfirmDialog`                                                 | dialog                 | default prefix `confirm`                                       |
| `<prefix>-cancel-btn` / `<prefix>-confirm-btn`          | confirm buttons                                                 | button                 |                                                                |
| `toast-region`                                          | live region                                                     | region                 |                                                                |
| `toast-success` / `-error` / `-info` / `-warning`       | toast                                                           | toast                  | `data-state` = variant; stays ≥ 4 s                            |
| `toast-title` / `toast-description` / `toast-close-btn` | toast parts                                                     | text / text / button   |                                                                |
| `<field>-error` / `<field>-hint`                        | form field messages                                             | error / hint           | derived from the control id                                    |
| `<field>-toggle-btn`                                    | `PasswordInput` show/hide                                       | button                 | `aria-pressed`                                                 |
| `<field>-option`                                        | `Select` options                                                | option                 | `data-value`                                                   |

## App shell

Constants: `AppShell`, `NavLinks` in `tests/locators/shell.ts`.

| testid                                                                 | element                  | type                    | notes                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `nav`                                                                  | sidebar navigation       | nav                     | desktop sidebar or the mobile drawer                                                                               |
| `nav-<route>-link`                                                     | sidebar link             | link                    | route without the area: `/org/exams/published` → `nav-exams-published-link`; active link has `aria-current="page"` |
| `nav-drawer` / `nav-drawer-close-btn`                                  | mobile navigation drawer | dialog / button         | below 1024 px                                                                                                      |
| `topbar-nav-toggle-btn`                                                | menu toggle              | button                  | collapses the sidebar / opens the drawer                                                                           |
| `topbar-user-name` / `topbar-user-email`                               | signed-in user           | text                    | hidden below 640 px                                                                                                |
| `topbar-account-menu-btn` / `topbar-account-menu`                      | account menu             | button / menu           |                                                                                                                    |
| `topbar-account-signout-menu-item`                                     | Sign out                 | menu-item               |                                                                                                                    |
| `skip-to-content-link`                                                 | skip link                | link                    | visible on keyboard focus                                                                                          |
| `breadcrumb` / `breadcrumb-link`                                       | breadcrumb               | nav / link              | links carry `data-to`                                                                                              |
| `access-denied` / `access-denied-home-link`                            | no-permission screen     | alert / link            |                                                                                                                    |
| `account-load-error` / `-retry-btn` / `account-load-error-signout-btn` | account could not load   | error / button / button |                                                                                                                    |

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

## Not converted yet

All other screens (registration, password reset, organization, academic structure, courses, subjects, topics,
teachers, students, users, question bank, exams, assignments, exam runner, results, reports, dashboards, platform)
still use the shared-component defaults only. Each gets its ids, a `page-<name>` root and its section here in
the phase that works on it. `npm run check:testids -- --list` shows what is left.

## Change log

| date       | change                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-28 | Foundation: ids added to all shared components, the app shell and the login screen. Nothing renamed or removed (the existing `dialog-overlay` is kept). |
