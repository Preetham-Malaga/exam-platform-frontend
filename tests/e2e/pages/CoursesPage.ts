// Page object for /org/courses (the Courses tree) and the course form page. Uses only tests/locators/courses.ts.
import { expect, type Page } from '@playwright/test';
import { CourseForm as F, CoursesPage as C } from '../../locators/courses';

export class CoursesPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  readonly row = (code: string) => this.page.locator(C.courseRowByCode(code));

  async goto(): Promise<void> {
    await this.page.goto('/org/courses');
    await expect(this.page.locator(C.root)).toHaveAttribute('data-ready', 'true');
  }

  /** Opens the course form page, fills the required fields and saves; lands back on the tree. */
  async add(name: string, code: string): Promise<void> {
    await this.page.locator(C.addCourseBtn).click();
    await expect(this.page.locator(F.root)).toHaveAttribute('data-ready', 'true');
    await this.page.locator(F.nameInput).fill(name);
    await this.page.locator(F.codeInput).fill(code);
    await this.page.locator(F.courseTypeSelect).selectOption('Degree');
    await this.page.locator(F.durationValueInput).fill('4');
    await this.page.locator(F.saveBtn).click();
  }

  /** Asks to delete; the confirmation replaces the course's row. */
  async askDelete(code: string): Promise<void> {
    await this.row(code).locator(C.courseDeleteBtn).click();
  }
}
