// PURPOSE: /login - sign in with email and password (or Google) through Supabase Auth.
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
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { getRememberMe, setRememberMe } from '@/lib/authStorage';
import { authService } from '@/services/authService';

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { toast } = useToast();
  const { sessionExpired } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [remember, setRemember] = useState(getRememberMe);
  const [googleBusy, setGoogleBusy] = useState(false);
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

  const google = async () => {
    setFormError(null);
    setGoogleBusy(true);
    setRememberMe(remember);
    const r = await authService.signInWithGoogle();
    if (!r.ok) {
      setGoogleBusy(false);
      setFormError(
        r.reason === 'not_enabled'
          ? 'Google sign-in is not enabled for this platform yet. Please use your email and password.'
          : 'We could not start Google sign-in. Please try again.',
      );
    } // on success the browser is already on its way to Google
  };

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
      title="Welcome Back"
      subtitle="Sign in to continue to your account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-[#3b5bdb] hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {sessionExpired && (
        <p role="status" className="mb-4 rounded-lg bg-warning/15 px-3 py-2 text-sm text-text">
          Your session has expired. Please sign in again.
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          placeholder="Enter your email address"
          required
          leftIcon={<Icon name="mail" size={18} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          leftIcon={<Icon name="lock" size={18} />}
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex items-center justify-between gap-3">
          <Checkbox
            label="Remember me"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-[#3b5bdb] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        {formError && (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        )}
        {unverified && (
          <Button type="button" variant="outline" loading={resending} onClick={() => void resend()}>
            Resend verification email
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} className="h-12 text-base">
          Login
          <Icon name="arrowRight" size={18} />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or continue with
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        loading={googleBusy}
        leftIcon={<GoogleLogo />}
        onClick={() => void google()}
      >
        Continue with Google
      </Button>
    </AuthLayout>
  );
}
