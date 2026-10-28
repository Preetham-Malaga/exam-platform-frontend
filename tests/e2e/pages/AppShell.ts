// Page object for the signed-in frame: sidebar, topbar and the account menu. Uses tests/locators/shell.ts only.
import type { Page } from '@playwright/test';
import { AppShell as S } from '../../locators/shell';

export class AppShell {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  readonly nav = () => this.page.locator(S.nav);
  readonly userEmail = () => this.page.locator(S.userEmail);
  readonly accountMenuBtn = () => this.page.locator(S.accountMenuBtn);
  readonly navLink = (selector: string) => this.page.locator(selector);

  async signOut(): Promise<void> {
    await this.accountMenuBtn().click();
    await this.page.locator(S.signOutMenuItem).click();
  }
}
