// PURPOSE: Zod validation for the "invite admin" form (the backend validates again).
// WHY: Clear messages before sending anything.
// DEPENDS ON: zod.

import { z } from 'zod';

export const inviteAdminSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters')
    .max(150, 'Keep it under 150 characters'),
  email: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address'),
});
export type InviteAdminValues = z.infer<typeof inviteAdminSchema>;
