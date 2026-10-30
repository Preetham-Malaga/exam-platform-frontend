// PURPOSE: Zod validation for the authentication forms (the backend/Supabase validate again).
// WHY: Same password rule everywhere; clear messages before any request is sent.
// DEPENDS ON: zod.

import { z } from 'zod';

export const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address')
  .email('Enter a valid email address');

export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') });
export type LoginValues = z.infer<typeof loginSchema>;

// Prototype ORG_TYPES, mapped onto the institution types the API stores (they decide the default academic levels).
export const INSTITUTION_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'coaching', label: 'Coaching institute' },
  { value: 'degree', label: 'College / University' },
  { value: 'engineering', label: 'Engineering college' },
  { value: 'mba', label: 'Business school (MBA)' },
  { value: 'training', label: 'Training centre' },
] as const;

export const HEARD_FROM = [
  'Google search',
  'Referral from another institute',
  'Social media',
  'Event or exhibition',
  'Other',
].map((v) => ({ value: v, label: v }));

const required = (what: string) => z.string().trim().min(1, `Enter ${what}.`);

/** Prototype SPEC.signup: "Your institution" + "Owner account". The API checks everything again. */
export const registerSchema = z
  .object({
    orgName: required('your organization name')
      .min(2, 'Enter at least 2 characters.')
      .max(120, 'Keep it to 120 characters or fewer.'),
    instType: z.enum(['engineering', 'degree', 'school', 'mba', 'coaching', 'training'], {
      message: 'Choose institution type.',
    }),
    city: required('city').min(2, 'Enter at least 2 characters.').max(100),
    state: z.string().min(1, 'Choose state / UT.'),
    firstName: required('first name').max(50, 'Keep it to 50 characters or fewer.'),
    lastName: z.string().trim().max(50, 'Keep it to 50 characters or fewer.'),
    email: z
      .string()
      .trim()
      .min(1, 'Enter work email.')
      .email('Enter a valid email, like name@institution.org.'),
    mobile: z
      .string()
      .trim()
      .min(1, 'Enter mobile number.')
      .refine(
        (v) => /^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')),
        'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.',
      ),
    password: passwordRule,
    confirm: z.string().min(1, 'Enter confirm password.'),
    heard: z.string(),
    terms: z.boolean().refine((v) => v, 'Tick this box to continue.'),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: "Passwords don't match.",
  });
export type RegisterValues = z.infer<typeof registerSchema>;

/** Which form field a server error belongs to (API field name → form key). */
export const REGISTER_FIELD_FROM_API: Record<string, keyof RegisterValues> = {
  organizationName: 'orgName',
  institutionType: 'instType',
  ownerName: 'firstName',
  email: 'email',
  password: 'password',
  mobile: 'mobile',
  city: 'city',
  state: 'state',
  acceptTerms: 'terms',
};

export const forgotSchema = z.object({ email });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password: passwordRule, confirmPassword: z.string().min(1, 'Repeat your password') })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ResetValues = z.infer<typeof resetSchema>;
