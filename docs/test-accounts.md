# Test accounts and running the e2e tests

## Fixed accounts per role

One organization, **E2E Test College**, with one login per role. All share one password, which is never committed.

| role               | e-mail                           | lands on             |
| ------------------ | -------------------------------- | -------------------- |
| Organization owner | `e2e.owner@exam-platform.test`   | `/org/dashboard`     |
| Organization admin | `e2e.admin@exam-platform.test`   | `/org/dashboard`     |
| Teacher            | `e2e.teacher@exam-platform.test` | `/teacher/dashboard` |
| Student            | `e2e.student@exam-platform.test` | `/student/dashboard` |

The teacher and the student also have their records (`E2E-T1`, roll number `E2E-S1`), the same as an accepted invitation.

## Create or repair them

From the backend folder (needs its `.env`; refuses to run with `NODE_ENV=production`):

```
npm run seed:e2e
```

This runs `node scripts/seed-e2e.mjs --accounts-file tests/frontend/.env.e2e`. It is safe to run again: it only adds
what is missing and re-sets the password. The password comes from `E2E_PASSWORD` if set, otherwise from the existing
`.env.e2e`, otherwise a new random one. It is written to `.env.e2e` (git-ignored) and never printed.
`E2E_EMAIL_DOMAIN` changes the e-mail domain.

## Environment variables

See `.env.e2e.example`. Locally they come from `.env.e2e`; in CI set them as secrets.

| variable                                                                       | meaning                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `E2E_PASSWORD`                                                                 | password of all test accounts                                                                                |
| `E2E_OWNER_EMAIL`, `E2E_ADMIN_EMAIL`, `E2E_TEACHER_EMAIL`, `E2E_STUDENT_EMAIL` | the accounts above                                                                                           |
| `E2E_BASE_URL`                                                                 | app to test; when unset, Playwright starts Vite on http://localhost:5173                                     |
| `PW_CHANNEL`                                                                   | browser: `chrome` (installed Google Chrome, default) or `chromium` (after `npx playwright install chromium`) |

A test whose account is not configured is **skipped** with the variable it needs; it does not fail.

## Run

1. Start the backend (`npm run dev` in the backend folder, port 4000).
2. In this folder: `npm run e2e`. Report: `npm run e2e:report`.

Tests wait on `data-ready="true"` and on URLs, never on fixed sleeps. Animations are off (`reducedMotion: 'reduce'`).
