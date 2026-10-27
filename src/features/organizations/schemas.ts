// PURPOSE: Zod validation for the organization forms (the backend validates again; this is for fast feedback).
// WHY: One schema gives both the error messages and the TypeScript type of the form values.
// DEPENDS ON: zod.

import { z } from 'zod';

export const organizationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters')
    .max(200, 'Keep it under 200 characters'),
  contactEmail: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  contactPhone: z.string().trim().max(30, 'Keep it under 30 characters'),
  address: z.string().trim().max(500, 'Keep it under 500 characters'),
});
export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export const brandingFormSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #363B6C'),
  tagline: z.string().trim().max(200, 'Keep it under 200 characters'),
});
export type BrandingFormValues = z.infer<typeof brandingFormSchema>;
