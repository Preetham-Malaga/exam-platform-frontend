// PURPOSE: /register - create an organization and its owner account (prototype vSignupFull, SPEC.signup).
// WHY: The backend creates the login and the whole organization atomically. Server errors are shown next to the field
//      they are about (error.field), with a summary on top; nothing is a pop-up. On success: /register/pending.
// DEPENDS ON: services/authService.ts (POST /auth/register), features/auth/schemas.ts, features/auth/india.ts.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Checkbox, Input, PasswordInput, Select } from '@/components/forms/Form';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageRoot } from '@/components/layout/PageRoot';
import { Button } from '@/components/ui/Button';
import { INDIAN_STATES } from '@/features/auth/india';
import {
  HEARD_FROM,
  INSTITUTION_TYPES,
  REGISTER_FIELD_FROM_API,
  registerSchema,
  type RegisterValues,
} from '@/features/auth/schemas';
import { ApiClientError } from '@/lib/api';
import { authService } from '@/services/authService';

const LABELS: Record<keyof RegisterValues, string> = {
  orgName: 'Organization name',
  instType: 'Institution type',
  city: 'City',
  state: 'State / UT',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Work email',
  mobile: 'Mobile number',
  password: 'Password',
  confirm: 'Confirm password',
  heard: 'How did you hear about us?',
  terms: 'Terms',
};
const ORDER = Object.keys(LABELS) as Array<keyof RegisterValues>;

function Section({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" data-testid={testId}>
      <legend className="mb-2.5 p-0 text-[15px] font-extrabold">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<RegisterValues>({
    resolver: async (values, context, options) => {
      const result = await zodResolver(registerSchema)(values, context, options);
      // Zod checks "passwords match" only once every other field is valid; tell the user now.
      if (values.confirm && values.password !== values.confirm && !result.errors.confirm)
        return {
          values: {},
          errors: {
            ...result.errors,
            confirm: { type: 'match', message: "Passwords don't match." },
          },
        };
      return result;
    },
    defaultValues: {
      orgName: '',
      instType: undefined,
      city: '',
      state: '',
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      password: '',
      confirm: '',
      heard: '',
      terms: false,
    },
  });

  const onSubmit = handleSubmit(
    async (v) => {
      setServerError(null);
      try {
        await authService.register({
          organizationName: v.orgName,
          institutionType: v.instType,
          ownerName: `${v.firstName} ${v.lastName}`.trim(),
          email: v.email,
          password: v.password,
          city: v.city,
          state: v.state,
          mobile: v.mobile,
          ...(v.heard ? { heardFrom: v.heard } : {}),
          acceptTerms: true,
        });
        navigate('/register/pending', {
          replace: true,
          state: { organizationName: v.orgName, email: v.email },
        });
      } catch (e) {
        const field =
          e instanceof ApiClientError && e.field ? REGISTER_FIELD_FROM_API[e.field] : undefined;
        const message =
          e instanceof ApiClientError
            ? e.message
            : 'We could not reach the server. Please try again.';
        if (field) {
          setError(field, { message }, { shouldFocus: true });
        } else setServerError(message);
      }
    },
    (errs: FieldErrors<RegisterValues>) => {
      const first = ORDER.find((k) => errs[k]);
      if (first) setFocus(first);
    },
  );

  const invalid = ORDER.filter((k) => errors[k]);
  return (
    <AuthLayout
      wide
      title="Create your account"
      subtitle="Set up your institution and your owner account. We review new organizations within one working day."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-accent" data-testid="signup-login-link">
            Log in
          </Link>
        </>
      }
    >
      <PageRoot testId="page-signup" className="flex flex-col gap-4">
        {submitCount > 0 && invalid.length > 0 && (
          <div
            role="alert"
            className="rounded-2xl bg-danger-bg px-3.5 py-3 text-[13px] font-semibold text-danger"
            data-testid="signup-error-summary"
          >
            <b>
              Fix {invalid.length} {invalid.length === 1 ? 'field' : 'fields'} to save:
            </b>{' '}
            {invalid.map((k, i) => (
              <span key={k}>
                {i > 0 && ' · '}
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 px-1 font-bold text-inherit underline"
                  onClick={() => setFocus(k)}
                  data-testid="signup-error-summary-link"
                  data-value={k}
                >
                  {LABELS[k]}
                </button>
              </span>
            ))}
          </div>
        )}
        {serverError && (
          <p
            role="alert"
            className="m-0 rounded-2xl bg-danger-bg px-3.5 py-3 text-[13px] font-semibold text-danger"
            data-testid="signup-server-error"
          >
            {serverError}
          </p>
        )}
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-5"
          data-testid="signup-form"
        >
          <Section title="Your institution" testId="signup-section-your-institution">
            <Input
              label="Organization name"
              required
              placeholder="e.g. ABC Engineering College"
              className="sm:col-span-2"
              data-testid="signup-org-name-input"
              error={errors.orgName?.message}
              {...register('orgName')}
            />
            <Select
              label="Institution type"
              required
              placeholder="Choose…"
              options={INSTITUTION_TYPES}
              hint="Sets your default batch structure."
              data-testid="signup-inst-type-select"
              error={errors.instType?.message}
              {...register('instType')}
            />
            <Input
              label="City"
              required
              placeholder="e.g. Hyderabad"
              autoComplete="address-level2"
              data-testid="signup-city-input"
              error={errors.city?.message}
              {...register('city')}
            />
            <Select
              label="State / UT"
              required
              placeholder="Choose…"
              options={INDIAN_STATES}
              data-testid="signup-state-select"
              error={errors.state?.message}
              {...register('state')}
            />
          </Section>
          <Section title="Owner account" testId="signup-section-owner-account">
            <Input
              label="First name"
              required
              autoComplete="given-name"
              data-testid="signup-first-name-input"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last name"
              autoComplete="family-name"
              data-testid="signup-last-name-input"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
            <Input
              label="Work email"
              type="email"
              required
              placeholder="you@institution.org"
              autoComplete="email"
              className="sm:col-span-2"
              hint="This is your login. We email you here when you are approved."
              data-testid="signup-email-input"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Mobile number"
              type="tel"
              required
              placeholder="98480 12345"
              autoComplete="tel"
              data-testid="signup-mobile-input"
              error={errors.mobile?.message}
              {...register('mobile')}
            />
            <Select
              label="How did you hear about us?"
              placeholder="Choose…"
              options={HEARD_FROM}
              data-testid="signup-heard-select"
              error={errors.heard?.message}
              {...register('heard')}
            />
            <PasswordInput
              label="Password"
              required
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
              data-testid="signup-password-input"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordInput
              label="Confirm password"
              required
              autoComplete="new-password"
              data-testid="signup-confirm-input"
              error={errors.confirm?.message}
              {...register('confirm')}
            />
            <div className="sm:col-span-2">
              <Checkbox
                label="I agree to the Terms of Service and Privacy Policy"
                data-testid="signup-terms-checkbox"
                aria-invalid={errors.terms ? true : undefined}
                aria-describedby={errors.terms ? 'signup-terms-err' : undefined}
                {...register('terms')}
              />
              {errors.terms && (
                <p
                  id="signup-terms-err"
                  className="m-0 mt-1 text-xs font-semibold text-danger"
                  data-testid="signup-terms-error"
                >
                  {errors.terms.message}
                </p>
              )}
            </div>
          </Section>
          <Button type="submit" loading={isSubmitting} data-testid="signup-submit-btn">
            Create organization
          </Button>
        </form>
      </PageRoot>
    </AuthLayout>
  );
}
