// PURPOSE: Shown instead of the app when the signed-in user's organization is not active yet (waiting for the platform
//          team's approval) or no longer (suspended / closed).
// WHY: The API refuses every organization request until approval (ORGANIZATION_NOT_ACTIVE); this explains why and offers
//      a re-check and Sign out, instead of a dashboard full of errors.
// DEPENDS ON: contexts/AuthContext.tsx, components/layout/AuthLayout.tsx.

import { useState } from 'react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageRoot } from '@/components/layout/PageRoot';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export function OrganizationNotActive({ status, name }: { status: string; name: string }) {
  const auth = useAuth();
  const [checking, setChecking] = useState(false);
  const waiting = status === 'pending_approval' || status === 'pending_email';
  const recheck = async () => {
    setChecking(true);
    await auth.refresh();
    setChecking(false);
  };
  return (
    <AuthLayout title={waiting ? 'Waiting for approval' : 'Organization not active'}>
      <PageRoot testId="page-organization-not-active" className="flex flex-col gap-4">
        <div
          className="flex flex-col gap-4"
          data-testid="organization-not-active"
          data-state={status}
        >
          <Badge tone={waiting ? 'warning' : 'error'} className="self-start">
            {waiting ? 'Awaiting approval' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          <p className="m-0 text-muted">
            {waiting ? (
              <>
                <b className="text-ink">{name}</b> is waiting for the platform team&apos;s approval.
                This usually takes one working day; we e-mail you as soon as you can start.
              </>
            ) : (
              <>
                <b className="text-ink">{name}</b> is {status}. Contact the platform team if you
                think this is a mistake.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {waiting && (
              <Button
                loading={checking}
                onClick={() => void recheck()}
                data-testid="organization-not-active-recheck-btn"
              >
                Check again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => void auth.signOut()}
              data-testid="organization-not-active-signout-btn"
            >
              Sign out
            </Button>
          </div>
        </div>
      </PageRoot>
    </AuthLayout>
  );
}
