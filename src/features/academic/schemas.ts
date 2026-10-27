// PURPOSE: Zod rules for the academic forms (the backend validates again with the same limits).
// WHY: Clear messages before anything is sent; codes follow the API rule (letters, digits, ".", "_", "-").
// DEPENDS ON: zod.

import { z } from 'zod';

const code = z
  .string()
  .trim()
  .min(1, 'Enter a code')
  .max(30, 'Keep it under 30 characters')
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Letters, digits, ".", "_" or "-" only (no spaces)');
const name = z.string().trim().min(1, 'Enter a name').max(150, 'Keep it under 150 characters');
const description = z.string().trim().max(1000, 'Keep it under 1000 characters');

export const levelSchema = z.object({ name });
export type LevelValues = z.infer<typeof levelSchema>;

/** Shown only when editing; new records always start active. */
const status = z.enum(['active', 'inactive']);

export const unitSchema = z.object({
  levelId: z.string().min(1, 'Choose a level'),
  code,
  name,
  status,
});
export type UnitValues = z.infer<typeof unitSchema>;

export const courseSchema = z.object({
  code,
  name,
  description,
  academicUnitId: z.string(),
  status,
});
export type CourseValues = z.infer<typeof courseSchema>;

export const subjectSchema = z.object({
  code,
  name,
  description,
  courseId: z.string(),
  academicUnitId: z.string(),
  status,
});
export type SubjectValues = z.infer<typeof subjectSchema>;

export const topicSchema = z.object({ name });
export type TopicValues = z.infer<typeof topicSchema>;

/** Empty form strings become null for the API ("no unit", "no description"). */
export const orNull = (s: string): string | null => (s.trim() === '' ? null : s.trim());
