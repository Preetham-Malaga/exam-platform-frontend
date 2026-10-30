// PURPOSE: /register/pending - shown right after sign-up (prototype vPending): what happens next, in order.
// WHY: New organizations verify their e-mail, then wait for the platform team's approval (backend migration 043).
// DEPENDS ON: components/layout/AuthLayout.tsx, services/authService.ts (resend verification).

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageRoot } from '@/components/layout/PageRoot';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { authService } from '@/services/authService';

function Step({ n, done, children }: { n: number; done?: boolean; children: React.ReactNode }) {
  return (
    <li
      className="flex items-center gap-2.5 font-semibold"
      data-testid="signup-pending-step"
      data-state={done ? 'done' : 'todo'}
    >
      <span
        className={
          done
            ? 'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint text-mint-ink'
            : 'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bg text-[13px] font-extrabold text-muted'
        }
      >
        {done ? <Icon name="check" size={14} /> : n}
      </span>
      <span className={done ? 'text-muted line-through' : undefined}>{children}</span>
    </li>
  );
}

export default function SignupPendingPage() {
  const { toast } = useToast();
  const state = (useLocation().state ?? {}) as { organizationName?: string; email?: string };
  const [busy, setBusy] = useState(false);
  const resend = async () => {
    if (!state.email) return;
    setBusy(true);
    const ok = await authService.resendVerification(state.email);
    setBusy(false);
    toast(
      ok
        ? { title: 'Verification email sent again', description: state.email, variant: 'success' }
        : {
            title: 'Could not send the email',
            description: 'Try again in a few minutes.',
            variant: 'error',
          },
    );
  };
  return (
    <AuthLayout title="Request received">
      <PageRoot testId="page-signup-pending" className="flex flex-col gap-4">
        <div data-testid="signup-pending" className="flex flex-col gap-4">
          <Badge tone="warning" className="self-start">
            <span data-state="pending">Awaiting approval</span>
          </Badge>
          <p className="m-0 text-muted">
            We&apos;ve created{' '}
            <b className="text-ink">{state.organizationName ?? 'your organization'}</b>. First
            verify your e-mail: we sent a link to{' '}
            <b className="text-ink">{state.email ?? 'your address'}</b>. Then our team reviews new
            organizations within one working day and e-mails you when you can log in.
          </p>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            <Step n={1} done>
              Organization created
            </Step>
            <Step n={2}>Verify your e-mail address</Step>
            <Step n={3}>Approval by the platform team</Step>
            <Step n={4}>Log in and follow the setup checklist</Step>
          </ol>
          <div className="flex flex-wrap gap-2.5">
            {state.email && (
              <Button
                variant="secondary"
                loading={busy}
                onClick={() => void resend()}
                data-testid="signup-pending-resend-btn"
              >
                Resend verification e-mail
              </Button>
            )}
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center rounded-full bg-bg px-[18px] font-bold text-ink no-underline"
              data-testid="signup-pending-login-link"
            >
              Back to login
            </Link>
          </div>
        </div>
      </PageRoot>
    </AuthLayout>
  );
}
