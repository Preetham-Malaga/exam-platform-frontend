// A controllable stand-in for the Supabase browser client (sessions, auth events, auth calls). Tests only.
import type { Session } from '@supabase/supabase-js';
import { vi } from 'vitest';

type Listener = (event: string, session: Session | null) => void;
export const state = { session: null as Session | null, listeners: new Set<Listener>() };

export const fakeSession = (email = 'owner@college.test', id = 'u1'): Session =>
  ({
    access_token: `tok-${id}`,
    refresh_token: 'r',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id, email, email_confirmed_at: '2026-01-01T00:00:00Z' },
  }) as unknown as Session;

/** Pretend Supabase raised an auth event (sign in, sign out ...). */
export function emit(event: string, session: Session | null): void {
  state.session = session;
  for (const l of [...state.listeners]) l(event, session);
}

export const fakeSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
};

/** Call in beforeEach: signed out, listeners cleared, every call succeeds unless a test overrides it. */
export function resetFakeSupabase(initial: Session | null = null): void {
  state.session = initial;
  state.listeners.clear();
  const a = fakeSupabase.auth;
  a.getSession
    .mockReset()
    .mockImplementation(async () => ({ data: { session: state.session }, error: null }));
  a.onAuthStateChange.mockReset().mockImplementation((cb: Listener) => {
    state.listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => state.listeners.delete(cb) } } };
  });
  a.signInWithPassword.mockReset().mockResolvedValue({ data: {}, error: null });
  a.signInWithOAuth.mockReset().mockResolvedValue({ data: {}, error: null });
  a.signOut.mockReset().mockImplementation(async () => {
    emit('SIGNED_OUT', null);
    return { error: null };
  });
  a.resend.mockReset().mockResolvedValue({ data: {}, error: null });
  a.resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
  a.updateUser.mockReset().mockResolvedValue({ data: {}, error: null });
}
