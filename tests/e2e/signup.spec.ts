// Sign-up form checks (prototype SPEC.signup). Nothing is submitted to the server here: a real sign-up sends an e-mail
// through Supabase, which is rate-limited, so the full flow is covered by unit tests with a mocked API.
import { expect, test } from '@playwright/test';
import { SignupPage as S } from '../locators/signup';
import { expectUniqueTestIds } from './support/testids';

test('sign-up lists every missing field, focuses the first, and checks mobile and passwords', async ({
  page,
}) => {
  await page.goto('/register');
  await expect(page.locator(S.form)).toBeVisible();
  // No Google sign-in (the "How did you hear" list may still offer "Google search").
  await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(0);

  await page.locator(S.submitBtn).click();
  await expect(page.locator(S.errorSummary)).toContainText('Fix 10 fields to save');
  await expect(page.locator(S.orgNameInput)).toBeFocused();
  await expect(page.locator(S.termsError)).toBeVisible();

  await page.locator(S.mobileInput).fill('12345');
  await page.locator(S.passwordInput).fill('Passw0rd!x');
  await page.locator(S.confirmInput).fill('Different1');
  await page.locator(S.submitBtn).click();
  await expect(page.locator(S.mobileError)).toContainText('10-digit mobile number');
  await expect(page.locator(S.confirmError)).toContainText("Passwords don't match.");
  await expectUniqueTestIds(page);
});
