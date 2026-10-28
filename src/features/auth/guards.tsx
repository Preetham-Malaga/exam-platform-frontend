// PURPOSE: Route guards: RequireAuth (protected pages) and GuestOnly (login/register while signed out).
// WHY: Unauthenticated users must never see protected pages, and signed-in users should not see the login form.
//      This is UX; the API and database still enforce access.
// DEPENDS ON: contexts/AuthContext.tsx, features/auth/home.ts, shared feedback components.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { Button } from '@/components/ui/Button';
import { AccessDenied } from '@/components/feedback/AccessDenied';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import type { PermissionCode } from '@/utils/permissions';
import { homePathFor, safeReturnPath } from './home';

/** Signed in to Supabase, but the backend could not load the account (e.g. the API is down). */
function AccountLoadError() {
  const auth = useAuth();
  return (
    <div className="mx-auto max-w-md p-6">
      <ErrorState
        title="We could not load your account"
        testId="account-load-error"
        message={auth.error ?? undefined}
        onRetry={auth.refresh}
      />
      <div className="mt-2 text-center">
        <Button
          variant="ghost"
          onClick={() => void auth.signOut()}
          data-testid="account-load-error-signout-btn"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading') return <LoadingState label="Checking your session…" />;
  if (auth.status === 'signedOut')
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  if (auth.status === 'error') return <AccountLoadError />;
  return <Outlet />;
}

export function GuestOnly() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading') return <LoadingState label="Checking your session…" />;
  if (auth.status === 'signedIn') {
    const from = safeReturnPath((location.state as { from?: unknown } | null)?.from);
    return <Navigate to={from ?? homePathFor(auth.me)} replace />;
  }
  // Without this the login form would just reappear after a successful sign-in, with no explanation.
  if (auth.status === 'error') return <AccountLoadError />;
  return <Outlet />;
}

/** Route guard: the page opens only if the user holds the permission (any one of them when several are given). */
export function RequirePermission({
  permission,
  anyOf,
}: {
  permission?: PermissionCode;
  anyOf?: readonly PermissionCode[];
}) {
  const p = usePermissions();
  const allowed = permission ? p.can(permission) : anyOf ? p.canAny(anyOf) : true;
  return allowed ? <Outlet /> : <AccessDenied />;
}
