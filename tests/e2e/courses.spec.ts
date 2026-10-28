// Courses: add a course with the inline form, then delete it with the inline confirmation under its row.
// No pop-ups anywhere: nothing with role="dialog" may appear. Cleans up after itself (the course is deleted).
import { expect, test } from '@playwright/test';
import { Toast } from '../locators/common';
import { CoursesPage as C } from '../locators/courses';
import { CoursesPage } from './pages/CoursesPage';
import { LoginPage } from './pages/LoginPage';
import { account } from './support/accounts';
import { expectUniqueTestIds } from './support/testids';

test('owner adds and deletes a course inline, without pop-ups', async ({ page }) => {
  const owner = account('owner');
  const login = new LoginPage(page);
  await login.goto();
  await login.login(owner.email, owner.password);
  await expect(page).toHaveURL(/\/org\/dashboard$/, { timeout: 30_000 });

  const courses = new CoursesPage(page);
  await courses.goto();
  // Saving is two round trips to the database (create, then reload the list): allow for a slow network.
  const SAVE = { timeout: 30_000 };
  const code = `E2E${Date.now().toString(36).toUpperCase()}`;

  // Add: the form opens in the page, above the list.
  await courses.add('E2E Course', code);
  await expect(page.locator(Toast.success)).toBeVisible(SAVE);
  await expect(courses.form()).toBeHidden();
  await expect(courses.row(code)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectUniqueTestIds(page, 'main');

  // Delete: the confirmation appears under the course's own row.
  await courses.askDelete(code);
  const below = await courses.rowExpanded(code);
  await expect(below.locator(C.deleteConfirm)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await below.locator(C.deleteConfirmBtn).click();
  await expect(courses.row(code)).toHaveCount(0, SAVE);
});
