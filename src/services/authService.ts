// PURPOSE: Everything that talks to authentication: Supabase Auth (sign in/out, reset, resend, session) and our register/me API.
// WHY: Pages and the context never call supabase-js or build URLs themselves; errors are translated into safe, typed results.
// DEPENDS ON: lib/supabaseClient.ts, lib/api.ts, types/auth.ts.

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabaseClient';
import type { MeResponse, RegisterRequest, RegisterResponse, SignInResult } from '@/types/auth';

const origin = () => window.location.origin;

export const authService = {
  register: (body: RegisterRequest) =>
    api.post<RegisterResponse>(`${API_PREFIX}/auth/register`, body),
  me: () => api.get<MeResponse>(`${API_PREFIX}/me`),

  async getSession(): Promise<Session | null> {
    return (await supabase.auth.getSession()).data.session;
  },

  onAuthChange(listener: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange(listener);
    return () => data.subscription.unsubscribe();
  },

  async signIn(email: string, password: string): Promise<SignInResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { ok: true };
    const text = `${error.code ?? ''} ${error.message}`.toLowerCase();
    if (text.includes('email_not_confirmed') || text.includes('not confirmed'))
      return { ok: false, reason: 'email_not_verified' };
    if (text.includes('invalid_credentials') || text.includes('invalid login'))
      return { ok: false, reason: 'invalid_credentials' };
    if (error.status === 429 || text.includes('rate limit'))
      return { ok: false, reason: 'rate_limited' };
    return { ok: false, reason: 'unknown' };
  },

  /**
   * Google sign-in (Supabase OAuth). Checks first that the provider is enabled in the Supabase project, because an
   * unconfigured provider would otherwise send the user to a raw JSON error page.
   * On success the browser leaves for Google and comes back to /app.
   */
  async signInWithGoogle(): Promise<
    { ok: true } | { ok: false; reason: 'not_enabled' | 'unknown' }
  > {
    try {
      const res = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: env.VITE_SUPABASE_ANON_KEY },
      });
      const settings = (await res.json()) as { external?: { google?: boolean } };
      if (!settings.external?.google) return { ok: false, reason: 'not_enabled' };
    } catch {
      return { ok: false, reason: 'unknown' };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin()}/app` },
    });
    return error ? { ok: false, reason: 'unknown' } : { ok: true };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  async resendVerification(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${origin()}/verify-email` },
    });
    return !error;
  },

  /** Always resolves true unless the request itself failed: the answer never reveals whether an account exists. */
  async requestPasswordReset(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin()}/reset-password`,
    });
    return !error || error.status === 400 || error.status === 422;
  },

  async updatePassword(password: string): Promise<{ ok: true } | { ok: false; message: string }> {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) return { ok: true };
    const text = error.message.toLowerCase();
    if (text.includes('same') && text.includes('password'))
      return { ok: false, message: 'Choose a password you have not used before.' };
    if (text.includes('weak') || text.includes('at least'))
      return { ok: false, message: 'Choose a stronger password.' };
    return { ok: false, message: 'Your reset link may have expired. Request a new one.' };
  },
};
