// Fixed test accounts per role, read from the environment (.env.e2e locally, CI secrets in CI). Never hard-code passwords.
// Created by the backend seed script: npm run seed:e2e (see docs/test-accounts.md).
import { test } from '@playwright/test';

export type Role = 'owner' | 'admin' | 'teacher' | 'student';

export interface Account {
  role: Role;
  email: string;
  password: string;
  /** Where the app lands this role after sign-in (features/auth/home.ts). */
  home: string;
}

const HOME: Record<Role, string> = {
  owner: '/org/dashboard',
  admin: '/org/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
};

export const ROLES: Role[] = ['owner', 'admin', 'teacher', 'student'];

/** The account for a role, or skips the current test with a clear reason when it is not configured. */
export function account(role: Role): Account {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env.E2E_PASSWORD;
  test.skip(
    !email || !password,
    `E2E_${role.toUpperCase()}_EMAIL / E2E_PASSWORD not set (docs/test-accounts.md)`,
  );
  return { role, email: email!, password: password!, home: HOME[role] };
}
