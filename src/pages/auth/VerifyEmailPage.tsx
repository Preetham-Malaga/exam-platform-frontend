// PURPOSE: /verify-email - "check your inbox" after registering, and the landing page of the verification link.
// WHY: Supabase signs the user in when the link is opened; this page then confirms it and offers the way forward.
// DEPENDS ON: contexts/AuthContext.tsx, services/authService.ts.

import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Input } from '@/components/forms/Form';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { homePathFor } from '@/features/auth/home';
import { authService } from '@/services/authService';

const COOLDOWN_MS = 30_000;

export default function VerifyEmailPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const stateEmail = (useLocation().state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(stateEmail);
  const [cooling, setCooling] = useState(false);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (auth.status === 'signedIn') {
    return (
      <AuthLayout title="Email verified" subtitle="Your account is ready.">
        <Link
          to={homePathFor(auth.me)}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary/90"
        >
          Continue
        </Link>
      </AuthLayout>
    );
  }

  const resend = async () => {
    setSending(true);
    const ok = await authService.resendVerification(email.trim());
    setSending(false);
    if (ok) {
      toast({
        title: 'Verification email sent',
        description: 'Check your inbox (and spam folder).',
        variant: 'success',
      });
      setCooling(true);
      timer.current = setTimeout(() => setCooling(false), COOLDOWN_MS);
    } else
      toast({
        title: 'Could not send the email',
        description: 'Check the address and try again.',
        variant: 'error',
      });
  };

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        stateEmail
          ? `We sent a verification link to ${stateEmail}.`
          : 'We sent you a verification link.'
      }
      footer={
        <Link to="/login" className="font-medium text-primary underline">
          Back to sign in
        </Link>
      }
    >
      <p className="text-sm text-text">
        Open the link in that email to activate your account. After that you can sign in.
      </p>
      <div className="mt-6 grid gap-3">
        {!stateEmail && (
          <Input
            label="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <Button
          variant="outline"
          loading={sending}
          disabled={cooling || !email.trim()}
          onClick={() => void resend()}
        >
          {cooling ? 'Email sent - wait a moment to resend' : 'Resend verification email'}
        </Button>
      </div>
    </AuthLayout>
  );
}
