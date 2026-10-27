// PURPOSE: Creates the single browser Supabase client using the public anon key.
// WHY: Supabase Auth (Phase 5) and RLS-protected reads need one shared, correctly configured client.
// DEPENDS ON: lib/env.ts, @supabase/supabase-js. Used by authService (Phase 5).

import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';
import { env } from './env';

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // "Remember me" decides between localStorage and sessionStorage (lib/authStorage.ts).
    storage: authStorage,
  },
});
