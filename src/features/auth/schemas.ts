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

export const INSTITUTION_TYPES = [
  { value: 'engineering', label: 'Engineering college' },
  { value: 'degree', label: 'Degree college' },
  { value: 'school', label: 'School' },
  { value: 'mba', label: 'Business school' },
  { value: 'coaching', label: 'Coaching institute' },
  { value: 'training', label: 'Training institute' },
] as const;

export const registerSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, 'Enter at least 2 characters')
      .max(200, 'Keep it under 200 characters'),
    institutionType: z.enum(['engineering', 'degree', 'school', 'mba', 'coaching', 'training'], {
      message: 'Choose your institution type',
    }),
    ownerName: z
      .string()
      .trim()
      .min(2, 'Enter at least 2 characters')
      .max(150, 'Keep it under 150 characters'),
    email,
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Repeat your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password: passwordRule, confirmPassword: z.string().min(1, 'Repeat your password') })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ResetValues = z.infer<typeof resetSchema>;
