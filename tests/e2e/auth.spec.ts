// Login per role, logout and the login form's validation, against the real backend and Supabase Auth.
import { expect, test } from '@playwright/test';
import { NavLinks } from '../locators/shell';
import { AppShell } from './pages/AppShell';
import { LoginPage } from './pages/LoginPage';
import { account, ROLES } from './support/accounts';
import { expectUniqueTestIds } from './support/testids';

test.describe('login page', () => {
  test('opens at / and every id on it is unique', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    const login = new LoginPage(page);
    await expect(login.root()).toHaveAttribute('data-ready', 'true');
    await expectUniqueTestIds(page);
  });

  test('empty submit shows field errors wired to the inputs', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submitBtn().click();
    await expect(login.emailError()).toBeVisible();
    await expect(login.passwordError()).toBeVisible();
    const describedBy = await login.emailInput().getAttribute('aria-describedby');
    expect(describedBy).toContain(await login.emailError().getAttribute('id'));
  });

  test('password toggle shows and hides the password', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.passwordInput().fill('secret123');
    await expect(login.passwordInput()).toHaveAttribute('type', 'password');
    await login.passwordToggleBtn().click();
    await expect(login.passwordInput()).toHaveAttribute('type', 'text');
  });

  test('wrong password shows the form error and stays on /login', async ({ page }) => {
    const owner = account('owner');
    const login = new LoginPage(page);
    await login.goto();
    await login.login(owner.email, `${owner.password}-wrong`);
    await expect(login.error()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

for (const role of ROLES) {
  test(`${role} signs in to their dashboard and signs out`, async ({ page }) => {
    const user = account(role);
    const login = new LoginPage(page);
    await login.goto();
    await login.login(user.email, user.password);

    // Sign-in is two round trips (Supabase Auth, then the account from our API): allow for a slow network.
    await expect(page).toHaveURL(new RegExp(`${user.home}$`), { timeout: 30_000 });
    const shell = new AppShell(page);
    await expect(shell.userName()).toBeVisible();
    await expect(
      shell.navLink(role === 'student' ? NavLinks.home : NavLinks.dashboard),
    ).toBeVisible();
    // The shell only: the dashboards get their own ids in their phase (docs/locators.md → "Not converted yet").
    await expectUniqueTestIds(page, '[data-testid="sidebar"], [data-testid="page-header"]');

    await shell.signOut();
    await expect(page).toHaveURL(/\/login/);
    await expect(login.root()).toBeVisible();
    // The session is gone: a protected page sends the user back to sign in.
    await page.goto(user.home);
    await expect(page).toHaveURL(/\/login/);
  });
}
