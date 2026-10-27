// PURPOSE: /app - the page every user lands on after signing in (Phase 5). Later phases replace it with role dashboards.
// WHY: Proves sign-in worked: shows who you are, which organization and role, and links to what exists so far.
// DEPENDS ON: contexts/AuthContext.tsx, shared UI.

import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  ORGANIZATION_OWNER: 'Owner',
  ORGANIZATION_ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

export default function AppHomePage() {
  const { me } = useAuth();
  if (!me) return null;
  const name = me.user.fullName || me.user.email;
  return (
    <>
      <PageHeader title={`Welcome, ${name}`} description="You are signed in." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Your account">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="text-text">{me.user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Role</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {me.isPlatformAdmin && <Badge tone="info">Platform admin</Badge>}
                {me.roles.map((r) => (
                  <Badge key={r} tone="info">
                    {ROLE_LABEL[r] ?? r}
                  </Badge>
                ))}
                {!me.isPlatformAdmin && me.roles.length === 0 && <Badge>No role</Badge>}
              </dd>
            </div>
          </dl>
        </Card>
        <Card title="Your organization">
          {me.organization ? (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Name</dt>
                <dd className="text-text">{me.organization.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Code</dt>
                <dd className="font-mono font-semibold text-text">{me.organization.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Status</dt>
                <dd>
                  <StatusBadge status={me.organization.status} />
                </dd>
              </div>
              {me.permissions.includes('organization.read') && (
                <div>
                  <Link to="/org/profile" className="font-medium text-primary underline">
                    Open organization profile
                  </Link>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted">
              Your account is not linked to an active organization.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
