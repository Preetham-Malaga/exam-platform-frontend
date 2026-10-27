// PURPOSE: /forgot-password - request a password reset email.
// WHY: The confirmation never says whether an account exists (prevents account guessing).
// DEPENDS ON: services/authService.ts, features/auth/schemas.ts.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Input } from '@/components/forms/Form';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { forgotSchema, type ForgotValues } from '@/features/auth/schemas';
import { authService } from '@/services/authService';

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async (v) => {
    setFailed(false);
    const ok = await authService.requestPasswordReset(v.email);
    if (ok) setSentTo(v.email);
    else setFailed(true);
  });

  const footer = (
    <Link to="/login" className="font-medium text-primary underline">
      Back to sign in
    </Link>
  );
  if (sentTo) {
    return (
      <AuthLayout title="Check your email" footer={footer}>
        <p role="status" className="text-sm text-text">
          If an account exists for <strong>{sentTo}</strong>, we have sent a link to reset the
          password. The link works for a limited time.
        </p>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a reset link."
      footer={footer}
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        {failed && (
          <p role="alert" className="text-sm text-error">
            We could not send the email right now. Please try again in a minute.
          </p>
        )}
        <Button type="submit" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
