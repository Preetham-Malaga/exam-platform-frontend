// Courses: add a course on its own page, see it in the tree, then delete it with the confirmation shown in place.
// No pop-ups anywhere: nothing with role="dialog" may appear. Cleans up after itself (the course is deleted).
import { expect, test } from '@playwright/test';
import { Toast } from '../locators/common';
import { CourseForm, CoursesPage as C } from '../locators/courses';
import { CoursesPage } from './pages/CoursesPage';
import { LoginPage } from './pages/LoginPage';
import { account } from './support/accounts';
import { expectUniqueTestIds } from './support/testids';

test('owner adds a course on its own page and deletes it in place, without pop-ups', async ({
  page,
}) => {
  const owner = account('owner');
  const login = new LoginPage(page);
  await login.goto();
  await login.login(owner.email, owner.password);
  await expect(page).toHaveURL(/\/org\/dashboard$/, { timeout: 30_000 });

  const courses = new CoursesPage(page);
  await courses.goto();
  const SAVE = { timeout: 30_000 };
  const code = `E2E${Date.now().toString(36).toUpperCase()}`.slice(0, 12);

  // An empty save lists every required field, and Cancel goes back to the tree.
  await page.locator(C.addCourseBtn).click();
  await page.locator(CourseForm.saveBtn).click();
  await expect(page.locator(CourseForm.errorSummary)).toContainText('Fix');
  await page.locator(CourseForm.cancelBtn).click();
  await expect(page).toHaveURL(/\/org\/courses$/);

  await courses.add('E2E Course', code);
  await expect(page.locator(Toast.success)).toBeVisible(SAVE);
  await expect(page).toHaveURL(/\/org\/courses$/, SAVE);
  await expect(courses.row(code)).toBeVisible(SAVE);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectUniqueTestIds(page, 'main');

  await courses.askDelete(code);
  await expect(page.locator(C.deleteConfirm)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator(C.deleteConfirmBtn).click();
  await expect(courses.row(code)).toHaveCount(0, SAVE);
});
