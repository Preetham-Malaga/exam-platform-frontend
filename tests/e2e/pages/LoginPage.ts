// Page object for /login. Uses only the locator constants in tests/locators/login.ts.
import { expect, type Page } from '@playwright/test';
import { LoginPage as L } from '../../locators/login';

export class LoginPage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  readonly root = () => this.page.locator(L.root);
  readonly emailInput = () => this.page.locator(L.emailInput);
  readonly passwordInput = () => this.page.locator(L.passwordInput);
  readonly submitBtn = () => this.page.locator(L.submitBtn);
  readonly error = () => this.page.locator(L.error);
  readonly emailError = () => this.page.locator(L.emailError);
  readonly passwordError = () => this.page.locator(L.passwordError);
  readonly passwordToggleBtn = () => this.page.locator(L.passwordToggleBtn);

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.root()).toHaveAttribute('data-ready', 'true');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.submitBtn().click();
  }
}
