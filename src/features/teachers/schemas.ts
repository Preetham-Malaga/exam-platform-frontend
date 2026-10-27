// PURPOSE: Zod rules for the add/edit teacher form (the backend validates again with the same limits).
// WHY: Clear messages before anything is sent; an invitation needs an e-mail address.
// DEPENDS ON: zod.

import { z } from 'zod';

export const teacherSchema = z
  .object({
    employeeCode: z
      .string()
      .trim()
      .min(1, 'Enter an employee code')
      .max(30, 'Keep it under 30 characters')
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Letters, digits, ".", "_" or "-" only (no spaces)'),
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter at least 2 characters')
      .max(150, 'Keep it under 150 characters'),
    email: z
      .string()
      .trim()
      .max(254)
      .refine(
        (v) => v === '' || z.string().email().safeParse(v).success,
        'Enter a valid email address',
      ),
    phone: z.string().trim().max(30, 'Keep it under 30 characters'),
    invite: z.boolean(),
    status: z.enum(['active', 'inactive']),
  })
  .refine((v) => !v.invite || v.email !== '', {
    path: ['email'],
    message: 'An e-mail address is needed to send the invitation',
  });
export type TeacherValues = z.infer<typeof teacherSchema>;
