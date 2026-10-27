// PURPOSE: Provides the signed-in user (Supabase session + /me from the backend) to the whole app.
// WHY: Session restore, expiry, sign-out and "who am I / what may I do" are needed by guards, layouts and pages.
// DEPENDS ON: services/authService.ts, lib/api.ts (unauthorized handler), TanStack Query. Mounted in app/providers.tsx.

import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiClientError, setUnauthorizedHandler } from '@/lib/api';
import { authService } from '@/services/authService';
import type { MeResponse } from '@/types/auth';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  me: MeResponse | null;
  error: string | null;
  /** True when the user was signed out because the server rejected their token. */
  sessionExpired: boolean;
  signOut: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const meKey = ['me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastUserId = useRef<string | null>(null);
  const sawEvent = useRef(false);

  useEffect(() => {
    let active = true;
    void authService.getSession().then((s) => {
      if (!active) return;
      // If an auth event (sign in/out) already arrived, it is newer than this lookup: do not overwrite it.
      if (!sawEvent.current) {
        lastUserId.current = s?.user.id ?? null;
        setSession(s);
      }
      setReady(true);
    });
    const unsubscribe = authService.onAuthChange((event, s) => {
      sawEvent.current = true;
      // Never keep one user's cached data around for another user.
      if (event === 'SIGNED_OUT' || (s && lastUserId.current && s.user.id !== lastUserId.current))
        qc.clear();
      lastUserId.current = s?.user.id ?? null;
      if (event === 'SIGNED_IN') setSessionExpired(false);
      setSession(s);
      setReady(true);
    });
    setUnauthorizedHandler(() => {
      setSessionExpired(true);
      void authService.signOut();
    });
    return () => {
      active = false;
      unsubscribe();
      setUnauthorizedHandler(null);
    };
  }, [qc]);

  const meQuery = useQuery({
    queryKey: meKey,
    queryFn: authService.me,
    enabled: Boolean(session),
    staleTime: 60_000,
    retry: false,
  });

  const signOut = useCallback(async () => {
    await authService.signOut();
    qc.clear();
  }, [qc]);

  const refresh = useCallback(() => void meQuery.refetch(), [meQuery]);

  const value = useMemo<AuthContextValue>(() => {
    let status: AuthStatus;
    if (!ready) status = 'loading';
    else if (!session) status = 'signedOut';
    else if (meQuery.isPending) status = 'loading';
    else if (meQuery.isError) status = 'error';
    else status = 'signedIn';
    const error = meQuery.isError
      ? meQuery.error instanceof ApiClientError
        ? meQuery.error.message
        : 'We could not load your account.'
      : null;
    return {
      status,
      session,
      me: session ? (meQuery.data ?? null) : null,
      error: session ? error : null,
      sessionExpired,
      signOut,
      refresh,
    };
  }, [
    ready,
    session,
    meQuery.isPending,
    meQuery.isError,
    meQuery.error,
    meQuery.data,
    sessionExpired,
    signOut,
    refresh,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Test seam: renders children with a fixed auth value (used by unit tests of context consumers). */
export function AuthContextTestProvider({
  value,
  children,
}: {
  value: Partial<AuthContextValue>;
  children: ReactNode;
}) {
  const full: AuthContextValue = {
    status: value.me ? 'signedIn' : 'signedOut',
    session: null,
    me: null,
    error: null,
    sessionExpired: false,
    signOut: async () => undefined,
    refresh: () => undefined,
    ...value,
  };
  return <AuthContext.Provider value={full}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to its provider on purpose
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
