// Login/Sign-up redesign: split layout, show/hide password, "Remember me" storage, Google sign-in.
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStorage, getRememberMe, setRememberMe } from '@/lib/authStorage';
import { emit, fakeSession, fakeSupabase, resetFakeSupabase } from '../helpers/fakeSupabase';
import { meFor, mockApi, renderRoute } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

/** Answers Supabase's public /auth/v1/settings; every other call goes to the mocked API. */
function stubGoogleSetting(enabled: boolean) {
  const api = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) =>
      url.endsWith('/auth/v1/settings')
        ? new Response(JSON.stringify({ external: { google: enabled, email: true } }))
        : api(url, init),
    ),
  );
}

beforeEach(() => {
  resetFakeSupabase(null);
  localStorage.clear();
  sessionStorage.clear();
  mockApi({ 'GET /api/v1/me': () => ({ data: meFor() }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('login screen', () => {
  it('shows the welcome card, the hero and exactly one page heading', async () => {
    renderRoute('/login');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome Back' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Sign in to continue to your account')).toBeInTheDocument();
    expect(screen.getByText('Track Your Progress')).toBeInTheDocument();
    expect(screen.getByText('Achieve More.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
  });

  it('the eye button shows and hides the password', async () => {
    renderRoute('/login');
    const pw = await screen.findByLabelText(/^Password/);
    expect(pw).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(pw).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(pw).toHaveAttribute('type', 'password');
  });

  it('"Remember me" is on by default and its choice is saved before signing in', async () => {
    fakeSupabase.auth.signInWithPassword.mockImplementation(async () => {
      await act(async () => emit('SIGNED_IN', fakeSession()));
      return { data: {}, error: null };
    });
    renderRoute('/login');
    const remember = await screen.findByLabelText('Remember me');
    expect(remember).toBeChecked();
    await userEvent.click(remember);
    await userEvent.type(screen.getByLabelText(/^Email/), 'owner@college.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Passw0rd!x');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(fakeSupabase.auth.signInWithPassword).toHaveBeenCalled());
    expect(getRememberMe()).toBe(false);
  });

  it('Google: explains when the provider is not enabled and does not leave the page', async () => {
    renderRoute('/login');
    stubGoogleSetting(false);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in is not enabled');
    expect(fakeSupabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('Google: starts the Supabase OAuth flow back to /app when enabled', async () => {
    renderRoute('/login');
    stubGoogleSetting(true);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    await waitFor(() =>
      expect(fakeSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/app` },
      }),
    );
  });
});

describe('sign-up screen', () => {
  it('uses the same layout, with show/hide on both password fields', async () => {
    renderRoute('/register');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Show password' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});

describe('Remember me storage', () => {
  it('remembered sessions live in localStorage; others only in sessionStorage (gone with the tab)', () => {
    setRememberMe(true);
    authStorage.setItem('sb-token', 'A');
    expect(localStorage.getItem('sb-token')).toBe('A');
    expect(sessionStorage.getItem('sb-token')).toBeNull();

    setRememberMe(false);
    authStorage.setItem('sb-token', 'B');
    expect(sessionStorage.getItem('sb-token')).toBe('B');
    expect(localStorage.getItem('sb-token')).toBeNull(); // the old remembered copy is removed
    expect(authStorage.getItem('sb-token')).toBe('B');

    authStorage.removeItem('sb-token');
    expect(authStorage.getItem('sb-token')).toBeNull();
  });
});
