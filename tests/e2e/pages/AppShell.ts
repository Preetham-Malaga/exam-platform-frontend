// Page object for the signed-in frame: sidebar card (menu, Log out) and the page header. Uses tests/locators/shell.ts only.
import type { Page } from '@playwright/test';
import { AppShell as S } from '../../locators/shell';

export class AppShell {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  readonly nav = () => this.page.locator(S.nav);
  readonly userName = () => this.page.locator(S.sidebarUserName);
  readonly navLink = (selector: string) => this.page.locator(selector);

  async signOut(): Promise<void> {
    await this.page.locator(S.logoutBtn).click();
  }
}
