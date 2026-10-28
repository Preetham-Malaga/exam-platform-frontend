// Page object for /org/courses. Uses only tests/locators/courses.ts. Add / edit / delete all happen in the page.
import { expect, type Page } from '@playwright/test';
import { CoursesPage as C } from '../../locators/courses';

export class CoursesPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  readonly form = () => this.page.locator(C.form);
  readonly row = (code: string) => this.page.locator(C.rowByCode(code));

  async goto(): Promise<void> {
    await this.page.goto('/org/courses');
    await expect(this.page.locator(`${C.table}, ${C.empty}`).first()).toBeVisible();
  }

  async add(name: string, code: string): Promise<void> {
    await this.page.locator(C.addBtn).click();
    await expect(this.form()).toBeVisible();
    await this.page.locator(C.nameInput).fill(name);
    await this.page.locator(C.codeInput).fill(code);
    await this.page.locator(C.saveBtn).click();
  }

  /** Opens the row's menu and asks to delete; the confirmation appears under the row. */
  async askDelete(code: string): Promise<void> {
    const row = this.row(code);
    await row.locator(C.rowActionsBtn).click();
    await this.page.locator(C.rowDeleteMenuItem).click();
  }

  async rowExpanded(code: string) {
    const id = await this.row(code).getAttribute('data-entity-id');
    return this.page.locator(C.rowExpanded(id!));
  }
}
