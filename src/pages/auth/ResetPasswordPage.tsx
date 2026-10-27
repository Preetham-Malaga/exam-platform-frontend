// PURPOSE: /reset-password - choose a new password after opening the reset link from the email.
// WHY: Opening the link gives a temporary Supabase session; without one the link is invalid or expired.
// DEPENDS ON: contexts/AuthContext.tsx, services/authService.ts, features/auth/schemas.ts.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/States';
import { useToast } from '@/components/feedback/Toast';
import { Input } from '@/components/forms/Form';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { homePathFor } from '@/features/auth/home';
import { resetSchema, type ResetValues } from '@/features/auth/schemas';
import { authService } from '@/services/authService';

export default function ResetPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const r = await authService.updatePassword(v.password);
    if (!r.ok) return setFormError(r.message);
    toast({ title: 'Password updated', variant: 'success' });
    navigate(homePathFor(auth.me), { replace: true });
  });

  if (auth.status === 'loading') return <LoadingState label="Checking your reset link…" />;
  if (auth.status === 'signedOut') {
    return (
      <AuthLayout
        title="This link is not valid"
        footer={
          <Link to="/login" className="font-medium text-primary underline">
            Back to sign in
          </Link>
        }
      >
        <p role="alert" className="text-sm text-text">
          The password reset link is invalid or has expired.
        </p>
        <Link
          to="/forgot-password"
          className="mt-4 inline-block font-medium text-primary underline"
        >
          Request a new link
        </Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use at least 8 characters, with a letter and a number."
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Repeat new password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {formError && (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
