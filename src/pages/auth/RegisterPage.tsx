// PURPOSE: /register - create an organization and its owner account.
// WHY: The backend creates the login and the whole organization atomically; we then ask the user to verify their email.
// DEPENDS ON: services/authService.ts (POST /auth/register), features/auth/schemas.ts.

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Input, PasswordInput, Select } from '@/components/forms/Form';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { INSTITUTION_TYPES, registerSchema, type RegisterValues } from '@/features/auth/schemas';
import { ApiClientError } from '@/lib/api';
import { authService } from '@/services/authService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: '',
      institutionType: undefined,
      ownerName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await authService.register({
        organizationName: v.organizationName,
        institutionType: v.institutionType,
        ownerName: v.ownerName,
        email: v.email,
        password: v.password,
      });
      navigate('/verify-email', { replace: true, state: { email: v.email } });
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'EMAIL_IN_USE')
        setError('email', {
          message: 'An account with this email already exists. Try signing in.',
        });
      else if (
        e instanceof ApiClientError &&
        e.code === 'VALIDATION_ERROR' &&
        Array.isArray((e as { details?: unknown }).details)
      ) {
        toast({ title: 'Please check the form', description: e.message, variant: 'error' });
      } else
        toast({
          title: 'Could not create the organization',
          description: e instanceof ApiClientError ? e.message : 'Please try again.',
          variant: 'error',
        });
    }
  });

  return (
    <AuthLayout
      wide
      title="Create your account"
      subtitle="Set up your institution and your owner account. Free trial included."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#3b5bdb] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <Input
          label="Organization name"
          required
          placeholder="e.g. ABC Engineering College"
          leftIcon={<Icon name="building" size={18} />}
          error={errors.organizationName?.message}
          {...register('organizationName')}
        />
        <Select
          label="Institution type"
          required
          placeholder="Choose…"
          options={INSTITUTION_TYPES}
          error={errors.institutionType?.message}
          {...register('institutionType')}
        />
        <Input
          label="Your full name"
          required
          placeholder="Enter your full name"
          leftIcon={<Icon name="user" size={18} />}
          autoComplete="name"
          error={errors.ownerName?.message}
          {...register('ownerName')}
        />
        <Input
          label="Email"
          type="email"
          required
          placeholder="Enter your email address"
          leftIcon={<Icon name="mail" size={18} />}
          autoComplete="username"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            label="Password"
            leftIcon={<Icon name="lock" size={18} />}
            required
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordInput
            label="Repeat password"
            leftIcon={<Icon name="lock" size={18} />}
            required
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <Button type="submit" loading={isSubmitting} className="h-12 text-base">
          Create organization
        </Button>
      </form>
    </AuthLayout>
  );
}
