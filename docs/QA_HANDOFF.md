# QA handoff — Exam Platform (prototype rebuild)

For: the QA team testing the rebuilt UI. Source of truth for how screens should look and behave:
`docs/design/exam-platform-prototype.html` (open it in a browser; switch roles with the black bar at the top).

Branches: frontend `feature/prototype-rebuild`, backend `feature/auth-approval`.

---

## 1. Before testing (one-time setup)

| #   | Step                                                                                                                   | Who       | Command / where                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | **Apply the database updates 043–046.** Without them sign-up, courses, questions, students, batches and learning fail. | Developer | `cd exam-platform-backend` then `npm run migrate`                                                            |
| 2   | Create / repair the test accounts                                                                                      | Developer | `npm run seed:e2e` (see `docs/test-accounts.md`)                                                             |
| 3   | Make a platform admin (approves new organizations)                                                                     | Developer | `node scripts/make-platform-admin.mjs --email <login>`                                                       |
| 4   | Real e-mail for sign-up and invitations (Supabase's built-in mailer allows only a few e-mails per hour)                | Developer | Supabase → Authentication → Emails → SMTP settings                                                           |
| 5   | Run the app                                                                                                            | Anyone    | backend: `npm run dev` (port 4000); frontend: `cd tests/frontend` then `npm run dev` → http://localhost:5173 |

All four migrations only **add** tables, columns or permissions; each has an undo script in `supabase/rollbacks/`.

Test logins (password in `tests/frontend/.env.e2e`, never committed):
`e2e.owner@…`, `e2e.admin@…`, `e2e.teacher@…`, `e2e.student@…` (`@exam-platform.test`).
To test Learning as the student, first put `E2E-S1` in a batch (Students → edit → Batch).

---

## 2. What to test, by screen

Locators: every element has a `data-testid`; the full list is in `docs/locators.md`, constants in `tests/locators/*.ts`.
Every screen root is `page-<name>` with `data-ready="true"` once its data has loaded — wait for that, not for time.

| Area        | Screen                                               | Route                                                                                                                                        | Key checks                                                                                                                                                                                                                                     |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth        | Login                                                | `/login`                                                                                                                                     | No Google button; wrong password message; Forgot password link                                                                                                                                                                                 |
| Auth        | Sign-up                                              | `/register`                                                                                                                                  | Empty save → "Fix N fields" summary, first field focused; mobile must be 10 digits starting 6–9; passwords must match; terms required; e-mail limit message is clear                                                                           |
| Auth        | Request received / Waiting for approval              | `/register/pending`, any page before approval                                                                                                | New organization cannot use the app until approved; "Check again" after approval                                                                                                                                                               |
| Platform    | Organizations                                        | `/platform/organizations`                                                                                                                    | Approve (confirmed in place); approved org can log in                                                                                                                                                                                          |
| Shell       | Sidebar                                              | every page                                                                                                                                   | Dashboard is a direct link; groups open/close and remember; current group always open; menu scrolls; Appearance (Light/Dark/System, 4 themes); Log out; below 860 px the menu button opens it in place                                         |
| Overview    | Dashboard                                            | `/org/dashboard`, `/teacher/dashboard`                                                                                                       | Filters (range, batch, course, exam) change numbers and stay in the URL; Reset; 6 tiles (Live classes today counts scheduled classes, with "live now"); 5 flow cards open their screens; attention list; exams table; Download PDF opens print |
| Academics   | Courses                                              | `/org/courses`                                                                                                                               | Tree; search; rename with Enter / Esc; delete confirmed in place and refused when it still has subjects/topics/questions; topic delete has Undo                                                                                                |
| Academics   | Course / subject / topic forms                       | `…/courses/new`, `…/courses/:id/edit`, `…/courses/:id/subjects/new`, `…/subjects/:id/edit`, `…/subjects/:id/topics/new`, `…/topics/:id/edit` | Required fields, code suggested from the name, marks ≤ maximum, end date ≥ start date                                                                                                                                                          |
| Academics   | Question Bank                                        | `/org/questions`                                                                                                                             | Course cards with counts and difficulty bar → subject tabs, difficulty chips, question cards; Show answer; Publish / Move to draft; Delete confirmed in place                                                                                  |
| Academics   | New / edit question                                  | `/org/questions/new`, `/org/questions/:id/edit`                                                                                              | Correct option required; options must differ                                                                                                                                                                                                   |
| Academics   | Import questions                                     | `/org/questions/import`                                                                                                                      | Template download; each line checked with its line number; import as draft or published; server-refused lines reported                                                                                                                         |
| Assessments | Exams                                                | `/org/exams`                                                                                                                                 | Draft / Published / Closed tabs with counts; Edit/Delete for drafts; Unpublish to edit only without attempts, else Locked; Duplicate opens a new draft                                                                                         |
| Assessments | Exam page                                            | `/org/exams/:id`                                                                                                                             | Questions, assignment, publish checklist, Duplicate                                                                                                                                                                                            |
| Learning    | Live Classes                                         | `/org/live`, `/teacher/live`, `/student/live`                                                                                                | Today / Upcoming / Past; Join only from 10 min before to the end; Copy link; Add recording after the class; student sees own batch only                                                                                                        |
| Learning    | Recorded Classes                                     | `…/recorded`                                                                                                                                 | Cards; Watch opens the link; Add recording; student sees own batch only, published only                                                                                                                                                        |
| Learning    | Materials                                            | `…/materials`                                                                                                                                | Grouped by subject; Open; View only badge; student sees own batch only, published only                                                                                                                                                         |
| Learning    | Forms                                                | `…/live/new`, `…/recorded/new`, `…/materials/new` (+ `/:id/edit`)                                                                            | Links must start with https://; batch required; date/time required for classes                                                                                                                                                                 |
| People      | Students                                             | `/org/students`                                                                                                                              | Batch column, "No batch" badge, Batch filter (incl. No batch); add opens `/org/students/new`; invite failure still saves the student and says why                                                                                              |
| People      | Teachers                                             | `/org/teachers`                                                                                                                              | Add opens `/org/teachers/new`; same invite behaviour                                                                                                                                                                                           |
| People      | Batches                                              | `/org/batches`                                                                                                                               | Tiles with counts; tile opens its students; delete refused while it has students; no-batch warning                                                                                                                                             |
| People      | Batch form                                           | `/org/batches/new`, `/org/batches/:id/edit`                                                                                                  | Required: name, code, course, start date                                                                                                                                                                                                       |
| People      | Admins                                               | `/org/admins`                                                                                                                                | Invite opens `/org/admins/new`                                                                                                                                                                                                                 |
| Insights    | Results, Leaderboard, Reports                        | `/org/results`, `/org/leaderboard`, `/org/reports`                                                                                           | Existing behaviour (not restyled yet, see §4)                                                                                                                                                                                                  |
| Settings    | Organization Profile                                 | `/org/profile`                                                                                                                               | Details; Branding theme applies to everyone (unless a person chose their own in Appearance); Date & time format, time format, time zone, week start with preview — dates across the app follow it after reload                                 |
| Settings    | Roles & Permissions                                  | `/org/settings/permissions`                                                                                                                  | Matrix per role                                                                                                                                                                                                                                |
| Student     | Home, My Exams, My Results, Leaderboard, exam runner | `/student/*`                                                                                                                                 | Existing behaviour                                                                                                                                                                                                                             |

Rules that apply everywhere:

- **No pop-ups.** Add / edit open their own page; deletes, publish, unpublish and submit are confirmed in place. Any `role="dialog"` is a bug.
- Every add / edit page: empty save shows "Fix N fields to save", the first bad field gets focus, each error sits under its field.
- Roles: a page a role may not use shows "You do not have access to this page" (try teacher on `/org/students/new` or `/org/batches/new`, student on `/org/courses`).
- Tenant isolation: data of another organization must never appear (two organizations needed to test).

---

## 3. Automated tests

| Suite                   | Command                                                      | Status at handoff                                     |
| ----------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Frontend unit (Vitest)  | `cd tests/frontend` then `npm test`                          | 223 tests passing                                     |
| Backend unit (Vitest)   | `npx vitest run --exclude "tests/frontend/**"`               | passing; database tests run only with a test database |
| Lint, types, locators   | `npm run lint`, `npm run typecheck`, `npm run check:testids` | clean                                                 |
| End-to-end (Playwright) | `cd tests/frontend` then `npm run e2e`                       | **Run after step 1.** Specs: auth, sign-up, courses   |

---

## 4. Known gaps (not bugs — not built yet)

- **Exams to batches:** exams are still assigned by academic unit, subject or student; the student form keeps the Academic unit field for that reason.
- **Exam form and question form** use the existing fields; the prototype's longer lists (exam security, notifications, question types beyond single-choice / true-false, Bloom level …) are not built.
- **Learning files** are links (Meet / Zoom, YouTube / Drive); uploading videos and files is not built. Live classes do not repeat.
- **Results, Leaderboard, Reports, Teachers, Admins** work but keep their earlier layout (not yet restyled to the prototype).
- **Settings › Notifications** page from the prototype is not built.
- **Download PDF** uses the browser's print dialog ("Save as PDF").
- Organization theme and date format reach a user at sign-in; a user already signed in sees a change after reloading.

## 5. Reporting a bug

Include: role and login used, route, steps, expected vs actual, screenshot, and the `data-testid` of the element if it
is about a specific control. Network failures: copy the response's `requestId` (in every API error) so it can be found
in the server log.
