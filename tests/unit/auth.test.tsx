import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { homePathFor, safeReturnPath } from '@/features/auth/home';
import { emit, fakeSession, fakeSupabase, resetFakeSupabase } from '../helpers/fakeSupabase';
import { meFor, mockApi, renderRoute, type Handler } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const org = {
  id: 'o1',
  orgCode: 'ORG-000007',
  name: 'Demo College',
  institutionType: 'engineering',
  status: 'active',
  contactEmail: null,
  contactPhone: null,
  address: null,
  branding: {},
  timezone: 'Asia/Kolkata',
  createdAt: '2026-01-01T00:00:00Z',
};
let api: Record<string, Handler>;
let calls: ReturnType<typeof mockApi>;

beforeEach(() => {
  resetFakeSupabase();
  api = {
    'GET /api/v1/me': () => ({ data: meFor() }),
    'GET /api/v1/organizations/current': () => ({ data: org }),
    'GET /api/v1/health': () => ({
      data: {
        status: 'ok',
        api: 'up',
        database: 'up',
        redis: 'up',
        version: '0.1.0',
        environment: 'test',
      },
    }),
  };
  calls = mockApi(api);
});
afterEach(() => vi.unstubAllGlobals());

const signInAs = async (email = 'owner@college.test', id = 'u1') => {
  await act(async () => emit('SIGNED_IN', fakeSession(email, id)));
};

describe('route guards', () => {
  it('sends a signed-out visitor from a protected page to /login and brings them back after sign-in', async () => {
    renderRoute('/org/profile');
    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    expect(calls.filter((c) => c.key === 'GET /api/v1/organizations/current')).toHaveLength(0); // protected data is never requested
    await signInAs();
    expect(
      await screen.findByRole('heading', { name: 'Organization profile' }),
    ).toBeInTheDocument();
  });

  it('shows a loading state while the stored session is being restored, then the page', async () => {
    let release: (v: unknown) => void = () => undefined;
    fakeSupabase.auth.getSession.mockImplementationOnce(() => new Promise((r) => (release = r)));
    renderRoute('/app');
    expect(await screen.findByText('Checking your session…')).toBeInTheDocument();
    await act(async () => release({ data: { session: fakeSession() }, error: null }));
    expect(await screen.findByRole('heading', { name: /Welcome, Asha Verma/ })).toBeInTheDocument();
  });

  it('restores an existing session on page load (no login needed)', async () => {
    resetFakeSupabase(fakeSession());
    renderRoute('/app');
    expect(await screen.findByRole('heading', { name: /Welcome, Asha Verma/ })).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'GET /api/v1/me')!.auth).toBe('Bearer tok-u1');
  });

  it('keeps signed-in users away from login/register/forgot-password', async () => {
    resetFakeSupabase(fakeSession());
    for (const path of ['/login', '/register', '/forgot-password']) {
      const { unmount } = renderRoute(path);
      expect(
        await screen.findByRole('heading', { name: /Welcome, Asha Verma/ }),
        path,
      ).toBeInTheDocument();
      unmount();
    }
  });

  it('lets signed-out visitors open the public auth pages', async () => {
    for (const [path, heading] of [
      ['/login', 'Welcome Back'],
      ['/register', 'Create your account'],
      ['/forgot-password', 'Forgot your password?'],
      ['/verify-email', 'Check your email'],
    ] as const) {
      const { unmount } = renderRoute(path);
      expect(await screen.findByRole('heading', { name: heading }), path).toBeInTheDocument();
      unmount();
    }
  });

  it('ignores unsafe "return to" values (open redirect)', async () => {
    for (const bad of [
      '//evil.com',
      'https://evil.com',
      '/\\evil',
      'javascript:alert(1)',
      42,
      null,
      undefined,
      '/login',
      '/register',
    ])
      expect(safeReturnPath(bad)).toBeNull();
    expect(safeReturnPath('/org/profile?tab=branding')).toBe('/org/profile?tab=branding');
    renderRoute('/login', { from: '//evil.com' });
    await signInAs();
    expect(await screen.findByRole('heading', { name: /Welcome, Asha Verma/ })).toBeInTheDocument();
  });

  it('shows a retryable error screen when the account cannot be loaded, with a Sign out escape', async () => {
    resetFakeSupabase(fakeSession());
    api['GET /api/v1/me'] = () => ({
      status: 500,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again.',
      },
    });
    renderRoute('/app');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong on our side');
    api['GET /api/v1/me'] = () => ({ data: meFor() });
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: /^Welcome, / })).toBeInTheDocument();
  });
});

describe('session expiry', () => {
  it('a rejected token on load signs the user out and explains why', async () => {
    resetFakeSupabase(fakeSession());
    api['GET /api/v1/me'] = () => ({
      status: 401,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Your session has expired. Please sign in again.',
      },
    });
    renderRoute('/app');
    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Your session has expired');
    expect(fakeSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('a 401 from any later request signs the user out; the banner disappears after the next sign-in', async () => {
    resetFakeSupabase(fakeSession());
    api['GET /api/v1/organizations/current'] = () => ({
      status: 401,
      error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' },
    });
    renderRoute('/org/profile');
    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();
    api['GET /api/v1/organizations/current'] = () => ({ data: org });
    await signInAs();
    expect(
      await screen.findByRole('heading', { name: 'Organization profile' }),
    ).toBeInTheDocument();
  });
});

describe('sign out and switching users', () => {
  it('Log out in the sidebar ends the session and returns to /login', async () => {
    resetFakeSupabase(fakeSession());
    renderRoute('/app');
    await screen.findByRole('heading', { name: /^Welcome, / });
    await userEvent.click(screen.getByTestId('nav-logout-btn'));
    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    expect(fakeSupabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("never shows the previous user's data to the next user", async () => {
    resetFakeSupabase(fakeSession());
    renderRoute('/app');
    await screen.findByRole('heading', { name: 'Welcome, Asha Verma' });
    api['GET /api/v1/me'] = () => ({
      data: meFor({
        user: { id: 'u2', email: 'ravi@college.test', fullName: 'Ravi Kumar' },
        roles: ['TEACHER'],
        permissions: [],
      }),
    });
    await act(async () => emit('SIGNED_IN', fakeSession('ravi@college.test', 'u2'))); // different user, no sign-out in between
    expect(await screen.findByRole('heading', { name: 'Welcome, Ravi Kumar' })).toBeInTheDocument();
    expect(screen.queryByText('Asha Verma')).not.toBeInTheDocument();
  });

  it('the home page shows role and organization, and only links to what the permissions allow', async () => {
    resetFakeSupabase(fakeSession());
    api['GET /api/v1/me'] = () => ({
      data: meFor({ roles: ['STUDENT'], permissions: ['leaderboard.read'] }),
    });
    renderRoute('/app');
    await screen.findByRole('heading', { name: /^Welcome, / });
    expect(within(screen.getByRole('main')).getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('ORG-000007')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Open organization profile' }),
    ).not.toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('validates before calling Supabase', async () => {
    renderRoute('/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Email/), 'nope');
    await userEvent.type(screen.getByLabelText(/Password/), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(fakeSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in with the trimmed email and goes to the home page', async () => {
    fakeSupabase.auth.signInWithPassword.mockImplementation(async () => {
      await act(async () => emit('SIGNED_IN', fakeSession()));
      return { data: {}, error: null };
    });
    renderRoute('/login');
    await userEvent.type(await screen.findByLabelText(/Email/), '  owner@college.test  ');
    await userEvent.type(screen.getByLabelText(/Password/), 'Passw0rd!x');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('heading', { name: /^Welcome, / })).toBeInTheDocument();
    expect(fakeSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@college.test',
      password: 'Passw0rd!x',
    });
  });

  it.each([
    [
      'invalid login credentials',
      { message: 'Invalid login credentials', code: 'invalid_credentials', status: 400 },
      'Incorrect email or password.',
    ],
    [
      'rate limit',
      { message: 'Request rate limit reached', status: 429 },
      'Too many attempts. Please wait a minute and try again.',
    ],
    [
      'anything else',
      { message: 'weird', status: 500 },
      'We could not sign you in. Please try again.',
    ],
  ])('shows a friendly message for %s (never the raw error)', async (_label, error, shown) => {
    fakeSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error });
    renderRoute('/login');
    await userEvent.type(await screen.findByLabelText(/Email/), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/Password/), 'Passw0rd!x');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(shown);
    expect(screen.queryByText('weird')).not.toBeInTheDocument();
  });

  it('offers to resend the verification email when the address is not verified yet', async () => {
    fakeSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Email not confirmed', code: 'email_not_confirmed', status: 400 },
    });
    renderRoute('/login');
    await userEvent.type(await screen.findByLabelText(/Email/), 'new@college.test');
    await userEvent.type(screen.getByLabelText(/Password/), 'Passw0rd!x');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('verify your email');
    await userEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    await waitFor(() =>
      expect(fakeSupabase.auth.resend).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'signup', email: 'new@college.test' }),
      ),
    );
    expect(await screen.findByText('Verification email sent')).toBeInTheDocument();
  });

  it('password field is masked and the page links to register and reset', async () => {
    renderRoute('/login');
    expect(await screen.findByLabelText(/Password/)).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
  });
});

describe('RegisterPage', () => {
  const fill = async (
    over: Partial<Record<'org' | 'type' | 'owner' | 'email' | 'pw' | 'pw2', string>> = {},
  ) => {
    const v = {
      org: 'Demo College',
      type: 'engineering',
      owner: 'Asha Verma',
      email: 'asha@college.test',
      pw: 'Passw0rd!x',
      pw2: 'Passw0rd!x',
      ...over,
    };
    await userEvent.type(await screen.findByLabelText(/Organization name/), v.org);
    if (v.type) await userEvent.selectOptions(screen.getByLabelText(/Institution type/), v.type);
    await userEvent.type(screen.getByLabelText(/Your full name/), v.owner);
    await userEvent.type(screen.getByLabelText(/^Email/), v.email);
    await userEvent.type(screen.getByLabelText(/^Password/), v.pw);
    await userEvent.type(screen.getByLabelText(/Repeat password/), v.pw2);
    await userEvent.click(screen.getByRole('button', { name: 'Create organization' }));
  };

  it('validates every field and sends nothing while invalid', async () => {
    renderRoute('/register');
    await userEvent.click(await screen.findByRole('button', { name: 'Create organization' }));
    expect(await screen.findByText('Choose your institution type')).toBeInTheDocument();
    expect(screen.getAllByText('Enter at least 2 characters').length).toBe(2);
    expect(calls.filter((c) => c.key === 'POST /api/v1/auth/register')).toHaveLength(0);
  });

  it.each([
    ['too short', 'Ab1', 'Use at least 8 characters'],
    ['no number', 'Passwordonly', 'Include at least one number'],
    ['no letter', '123456789', 'Include at least one letter'],
  ])('rejects a password that is %s', async (_l, pw, message) => {
    renderRoute('/register');
    await fill({ pw, pw2: pw });
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(calls.filter((c) => c.key === 'POST /api/v1/auth/register')).toHaveLength(0);
  });

  it('requires the two passwords to match', async () => {
    renderRoute('/register');
    await fill({ pw2: 'Different1' });
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('registers (without the repeat-password field) and asks the owner to verify their email', async () => {
    api['POST /api/v1/auth/register'] = () => ({
      status: 201,
      data: { organizationCode: 'ORG-000009', emailVerificationRequired: true },
    });
    renderRoute('/register');
    await fill();
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByText(/asha@college\.test/)).toBeInTheDocument();
    const call = calls.find((c) => c.key === 'POST /api/v1/auth/register')!;
    expect(call.body).toEqual({
      organizationName: 'Demo College',
      institutionType: 'engineering',
      ownerName: 'Asha Verma',
      email: 'asha@college.test',
      password: 'Passw0rd!x',
    });
    expect(call.auth).toBeNull(); // no token needed to register
  });

  it('shows "already exists" on the email field for a duplicate address', async () => {
    api['POST /api/v1/auth/register'] = () => ({
      status: 409,
      error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' },
    });
    renderRoute('/register');
    await fill();
    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument(); // stays on the form
  });

  it('shows a toast, and keeps the form, when the server fails', async () => {
    api['POST /api/v1/auth/register'] = () => ({
      status: 500,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again.',
      },
    });
    renderRoute('/register');
    await fill();
    expect(await screen.findByText('Could not create the organization')).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization name/)).toHaveValue('Demo College');
  });
});

describe('VerifyEmailPage', () => {
  it('shows where the link was sent and resends with a cooldown', async () => {
    renderRoute('/verify-email', { email: 'asha@college.test' });
    expect(await screen.findByText(/asha@college\.test/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    await waitFor(() =>
      expect(fakeSupabase.auth.resend).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'asha@college.test', type: 'signup' }),
      ),
    );
    expect(await screen.findByText('Verification email sent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wait a moment/ })).toBeDisabled();
  });

  it('asks for the email when it is not known (e.g. page opened directly) and blocks resend until filled', async () => {
    renderRoute('/verify-email');
    const resend = await screen.findByRole('button', { name: 'Resend verification email' });
    expect(resend).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Your email'), 'x@y.co');
    expect(resend).toBeEnabled();
  });

  it('reports a failed resend', async () => {
    fakeSupabase.auth.resend.mockResolvedValue({
      data: {},
      error: { message: 'nope', status: 400 },
    });
    renderRoute('/verify-email', { email: 'asha@college.test' });
    await userEvent.click(await screen.findByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByText('Could not send the email')).toBeInTheDocument();
  });

  it('after the verification link signs the user in, it says the email is verified and offers Continue', async () => {
    resetFakeSupabase(fakeSession());
    renderRoute('/verify-email');
    expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/app');
  });
});

describe('ForgotPasswordPage', () => {
  it('requests a reset email pointing back to /reset-password and gives a neutral confirmation', async () => {
    renderRoute('/forgot-password');
    await userEvent.type(await screen.findByLabelText(/Email/), 'asha@college.test');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /If an account exists for asha@college\.test/,
    );
    expect(fakeSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('asha@college.test', {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });

  it('does not reveal whether the address has an account (same message for "user not found")', async () => {
    fakeSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'User not found', status: 400 },
    });
    renderRoute('/forgot-password');
    await userEvent.type(await screen.findByLabelText(/Email/), 'ghost@college.test');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/If an account exists/);
  });

  it('tells the user when the request itself failed', async () => {
    fakeSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'server', status: 500 },
    });
    renderRoute('/forgot-password');
    await userEvent.type(await screen.findByLabelText(/Email/), 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not send the email');
  });

  it('validates the email first', async () => {
    renderRoute('/forgot-password');
    await userEvent.type(await screen.findByLabelText(/Email/), 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(fakeSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe('ResetPasswordPage', () => {
  it('rejects visitors without a valid reset session (expired or already used link)', async () => {
    renderRoute('/reset-password');
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired');
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.queryByLabelText(/New password/)).not.toBeInTheDocument();
  });

  it('with a reset session: validates, updates the password, and continues', async () => {
    resetFakeSupabase(fakeSession());
    renderRoute('/reset-password');
    await userEvent.type(await screen.findByLabelText(/^New password/), 'Newpass123');
    await userEvent.type(screen.getByLabelText(/^Repeat new password/), 'Different1');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(fakeSupabase.auth.updateUser).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByLabelText(/^Repeat new password/));
    await userEvent.type(screen.getByLabelText(/^Repeat new password/), 'Newpass123');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    await waitFor(() =>
      expect(fakeSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Newpass123' }),
    );
    expect(await screen.findByRole('heading', { name: /^Welcome, / })).toBeInTheDocument();
  });

  it.each([
    [
      'same password',
      { message: 'New password should be different from the old password (same_password)' },
      'Choose a password you have not used before.',
    ],
    ['weak password', { message: 'Password is too weak' }, 'Choose a stronger password.'],
    [
      'expired session',
      { message: 'Auth session missing' },
      'Your reset link may have expired. Request a new one.',
    ],
  ])('explains an update failure: %s', async (_l, error, shown) => {
    resetFakeSupabase(fakeSession());
    fakeSupabase.auth.updateUser.mockResolvedValue({ data: {}, error });
    renderRoute('/reset-password');
    await userEvent.type(await screen.findByLabelText(/^New password/), 'Newpass123');
    await userEvent.type(screen.getByLabelText(/^Repeat new password/), 'Newpass123');
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(shown);
  });
});

describe('Root path', () => {
  it('opens the sign-in screen when signed out', async () => {
    renderRoute('/');
    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
  });

  it('explains instead of showing the login form again when the account cannot be loaded', async () => {
    api['GET /api/v1/me'] = () => ({
      status: 503,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' },
    });
    renderRoute('/login');
    await screen.findByRole('heading', { name: 'Welcome Back' });
    await signInAs();
    expect(await screen.findByText('We could not load your account')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Welcome Back' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
  });
});

describe('homePathFor', () => {
  const me = (roles: string[], permissions: string[] = ['report.read']) =>
    meFor({ roles, permissions });
  it('sends each role to its dashboard', () => {
    expect(homePathFor(me(['ORGANIZATION_OWNER']))).toBe('/org/dashboard');
    expect(homePathFor(me(['ORGANIZATION_ADMIN']))).toBe('/org/dashboard');
    expect(homePathFor(me(['TEACHER']))).toBe('/teacher/dashboard');
    expect(homePathFor(me(['STUDENT'], []))).toBe('/student/dashboard');
  });
  it('falls back to /app when the dashboard would be refused or there is no organization', () => {
    expect(homePathFor(me(['TEACHER'], []))).toBe('/app');
    expect(homePathFor(me([]))).toBe('/app');
    expect(homePathFor({ ...me(['ORGANIZATION_OWNER']), organization: null })).toBe('/app');
    expect(homePathFor(null)).toBe('/app');
  });
});
