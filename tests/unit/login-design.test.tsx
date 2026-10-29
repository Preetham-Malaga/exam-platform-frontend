// Login/Sign-up (prototype vLogin / vSignupFull): hero + form, show/hide password, "Remember me" storage, no Google.
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStorage, getRememberMe, setRememberMe } from '@/lib/authStorage';
import { emit, fakeSession, fakeSupabase, resetFakeSupabase } from '../helpers/fakeSupabase';
import { meFor, mockApi, renderRoute } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

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
      await screen.findByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Sign in to continue to your account.')).toBeInTheDocument();
    expect(screen.getByText('Track your progress')).toBeInTheDocument();
    expect(screen.getByText('Achieve more.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    );
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
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(fakeSupabase.auth.signInWithPassword).toHaveBeenCalled());
    expect(getRememberMe()).toBe(false);
  });

  it('has no Google sign-in (email and password only)', async () => {
    renderRoute('/login');
    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(screen.queryByText(/Google/)).not.toBeInTheDocument();
    expect(fakeSupabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });
});

describe('sign-up screen', () => {
  it('uses the same layout, with show/hide on both password fields', async () => {
    renderRoute('/register');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Show password' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
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
