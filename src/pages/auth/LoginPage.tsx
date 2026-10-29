// PURPOSE: /login - sign in with email and password through Supabase Auth (prototype vLogin). No Google sign-in.
// WHY: Real authentication; the GuestOnly guard moves the user on as soon as the session exists.
//      "Remember me" decides whether the session survives closing the browser (lib/authStorage.ts).
// DEPENDS ON: services/authService.ts, contexts/AuthContext.tsx, features/auth/schemas.ts, lib/authStorage.ts.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Checkbox, Input, PasswordInput } from '@/components/forms/Form';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageRoot } from '@/components/layout/PageRoot';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { getRememberMe, setRememberMe } from '@/lib/authStorage';
import { authService } from '@/services/authService';

export default function LoginPage() {
  const { toast } = useToast();
  const { sessionExpired } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [remember, setRemember] = useState(getRememberMe);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    setUnverified(false);
    setRememberMe(remember);
    const result = await authService.signIn(v.email, v.password);
    if (result.ok) return; // the session change moves the user to their home page
    if (result.reason === 'email_not_verified') {
      setUnverified(true);
      setFormError('Please verify your email address before signing in.');
    } else if (result.reason === 'invalid_credentials')
      setFormError('Incorrect email or password.');
    else if (result.reason === 'rate_limited')
      setFormError('Too many attempts. Please wait a minute and try again.');
    else setFormError('We could not sign you in. Please try again.');
  });

  const resend = async () => {
    setResending(true);
    const ok = await authService.resendVerification(getValues('email').trim());
    setResending(false);
    toast(
      ok
        ? { title: 'Verification email sent', description: 'Check your inbox.', variant: 'success' }
        : {
            title: 'Could not send the email',
            description: 'Try again in a moment.',
            variant: 'error',
          },
    );
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your account."
      footer={
        <>
          New institution?{' '}
          <Link to="/register" className="font-bold text-accent" data-testid="login-signup-link">
            Create an account
          </Link>
        </>
      }
    >
      <PageRoot testId="page-login" className="flex flex-col gap-4">
        {sessionExpired && (
          <p
            role="status"
            className="m-0 rounded-2xl bg-butter px-3.5 py-3 text-[13px] font-semibold text-butter-ink"
            data-testid="login-session-expired-hint"
          >
            Your session has expired. Please sign in again.
          </p>
        )}
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-4"
          data-testid="login-form"
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            data-testid="login-email-input"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            required
            data-testid="login-password-input"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Checkbox
              label="Remember me"
              name="remember"
              data-testid="login-remember-checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <Link
              to="/forgot-password"
              className="font-bold text-accent"
              data-testid="login-forgot-link"
            >
              Forgot password?
            </Link>
          </div>
          {formError && (
            <p
              role="alert"
              className="m-0 text-xs font-semibold text-danger"
              data-testid="login-error"
            >
              {formError}
            </p>
          )}
          {unverified && (
            <Button
              type="button"
              variant="outline"
              loading={resending}
              onClick={() => void resend()}
              data-testid="login-resend-verification-btn"
            >
              Resend verification email
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            data-testid="login-submit-btn"
            data-loading={isSubmitting || undefined}
          >
            Log in
          </Button>
        </form>
      </PageRoot>
    </AuthLayout>
  );
}
