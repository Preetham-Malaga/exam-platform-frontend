// PURPOSE: Public home page: sign in / register links and the live backend status (signed-in users are sent to /app).
// WHY: Shows the real backend /health result, so a broken API URL or CORS setting is visible at once.
// DEPENDS ON: lib/api.ts, types/api.ts, TanStack Query. Replaced by the real landing page later.

import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { homePathFor } from '@/features/auth/home';
import { api } from '@/lib/api';
import { API_PREFIX, APP_NAME } from '@/lib/constants';
import type { HealthReport } from '@/types/api';

export default function LandingPage() {
  const auth = useAuth();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthReport>(`${API_PREFIX}/health`),
  });

  if (auth.status === 'signedIn') return <Navigate to={homePathFor(auth.me)} replace />;

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="rounded-card border border-border bg-card p-6 shadow-sm">
        <h1 className="text-[22px] font-bold text-primary">{APP_NAME}</h1>
        <p className="mt-1 text-muted">Multi-tenant examination and assessment platform.</p>

        <section aria-labelledby="api-status" className="mt-6">
          <h2 id="api-status" className="text-base font-semibold">
            API status
          </h2>
          {health.isPending && <p className="mt-2 text-muted">Checking…</p>}
          {health.isError && (
            <p role="alert" className="mt-2 text-error">
              {health.error.message}
            </p>
          )}
          {health.isSuccess && (
            <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
              <dt className="text-muted">Overall</dt>
              <dd className={health.data.status === 'ok' ? 'text-success' : 'text-warning'}>
                {health.data.status}
              </dd>
              <dt className="text-muted">Database</dt>
              <dd>{health.data.database}</dd>
              <dt className="text-muted">Redis</dt>
              <dd>{health.data.redis}</dd>
              <dt className="text-muted">Version</dt>
              <dd>{health.data.version}</dd>
            </dl>
          )}
        </section>

        <nav aria-label="Quick links" className="mt-6 flex flex-wrap gap-3 text-sm font-medium">
          <Link
            to="/login"
            className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-border px-4 py-2 text-text hover:bg-background"
          >
            Create an organization
          </Link>
          {import.meta.env.DEV && (
            <Link to="/dev/ui" className="px-2 py-2 text-primary underline">
              UI gallery (dev only)
            </Link>
          )}
        </nav>
      </div>
    </main>
  );
}
