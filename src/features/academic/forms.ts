// PURPOSE: Zod rules and option lists for the course, subject and topic form pages (prototype SPEC.course / .subject /
//          .topic), plus converters between form strings and the API's "details" object.
// WHY: Messages match the prototype ("Enter course name.", "Must be at least 1."); the backend checks the same limits.
// DEPENDS ON: zod, types/academic.ts.

import { z } from 'zod';
import type { CourseDetails, SubjectDetails, TopicDetails } from '@/types/academic';

export const COURSE_TYPES = [
  'Degree',
  'Diploma',
  'Certificate',
  'Coaching programme',
  'School class',
  'Short course',
] as const;
export const LANGUAGES = [
  'English',
  'Hindi',
  'Telugu',
  'Tamil',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Odia',
  'Punjabi',
  'Urdu',
] as const;
export const DURATION_UNITS = ['Months', 'Years', 'Semesters'] as const;
export const SUBJECT_TYPES = ['Theory', 'Practical', 'Lab', 'Elective', 'Project'] as const;
export const TERMS = [
  ...Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`),
  'Term 1',
  'Term 2',
  'Term 3',
] as const;
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export const STATUS_PILLS = ['Active', 'Inactive'] as const;

export const toOptions = (a: readonly string[]) => a.map((v) => ({ value: v, label: v }));

const code = z
  .string()
  .trim()
  .min(1, 'Enter a code.')
  .max(30, 'Keep it to 30 characters or fewer.')
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Use letters, numbers, ".", "_" or "-" (no spaces).');
const name = (what: string, max: number) =>
  z.string().trim().min(1, `Enter ${what}.`).max(max, `Keep it to ${max} characters or fewer.`);
/** Optional number typed as text: "" is allowed; anything else must be a number in range. */
const num = (min: number, max: number, int = false) =>
  z
    .string()
    .trim()
    .refine((s) => s === '' || !Number.isNaN(Number(s)), 'Enter a number.')
    .refine((s) => s === '' || Number(s) >= min, `Must be at least ${min}.`)
    .refine((s) => s === '' || Number(s) <= max, `Must be ${max} or less.`)
    .refine((s) => !int || s === '' || Number.isInteger(Number(s)), 'Use a whole number.');
const required = (s: ReturnType<typeof num>, msg: string) => s.refine((v) => v.trim() !== '', msg);

export const courseFormSchema = z
  .object({
    name: name('course name', 80),
    code,
    courseType: z.string().min(1, 'Choose course type.'),
    department: z.string().trim().max(100, 'Keep it to 100 characters or fewer.'),
    medium: z.string(),
    description: z.string().trim().max(1000, 'Keep it to 1000 characters or fewer.'),
    durationValue: required(num(1, 120, true), 'Enter duration.'),
    durationUnit: z.string().min(1, 'Choose duration unit.'),
    terms: num(1, 20, true),
    startDate: z.string(),
    endDate: z.string(),
    seats: num(1, 100000, true),
    fee: num(0, 100000000),
    status: z.enum(STATUS_PILLS),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'Must be on or after start date.',
  });
export type CourseFormValues = z.infer<typeof courseFormSchema>;

export const subjectFormSchema = z
  .object({
    courseId: z.string().min(1, 'Choose course.'),
    name: name('subject name', 80),
    code,
    subjectType: z.string().min(1, 'Choose subject type.'),
    term: z.string(),
    credits: num(0, 10),
    description: z.string().trim().max(1000, 'Keep it to 1000 characters or fewer.'),
    maxMarks: num(1, 10000),
    passMarks: num(0, 10000),
    internalMarks: num(0, 10000),
    externalMarks: num(0, 10000),
    weeklyHours: num(0, 40),
    order: num(1, 10000, true),
    status: z.enum(STATUS_PILLS),
  })
  .superRefine((v, ctx) => {
    const max = v.maxMarks === '' ? null : Number(v.maxMarks);
    if (max == null) return;
    for (const k of ['passMarks', 'internalMarks', 'externalMarks'] as const)
      if (v[k] !== '' && Number(v[k]) > max)
        ctx.addIssue({ code: 'custom', path: [k], message: "Can't be more than maximum marks." });
  });
export type SubjectFormValues = z.infer<typeof subjectFormSchema>;

export const topicFormSchema = z.object({
  courseId: z.string().min(1, 'Choose course.'),
  subjectId: z.string().min(1, 'Choose subject.'),
  name: name('topic name', 120),
  code: z.string().trim().max(10, 'Keep it to 10 characters or fewer.'),
  objectives: z.string().trim().max(2000, 'Keep it to 2000 characters or fewer.'),
  hours: num(0, 200),
  difficulty: z.enum(DIFFICULTIES),
  order: num(1, 10000, true),
  status: z.enum(STATUS_PILLS),
});
export type TopicFormValues = z.infer<typeof topicFormSchema>;

// ---------- form strings ⇄ API details ----------
const n = (s: string) => (s.trim() === '' ? undefined : Number(s));
const t = (s: string) => (s.trim() === '' ? undefined : s.trim());
const str = (v: number | string | undefined) => (v == null ? '' : String(v));
/** Drops empty values so the API stores only what was filled in. */
const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export const courseDetailsFrom = (v: CourseFormValues): CourseDetails =>
  clean({
    courseType: t(v.courseType),
    department: t(v.department),
    medium: t(v.medium),
    durationValue: n(v.durationValue),
    durationUnit: (t(v.durationUnit) as CourseDetails['durationUnit']) ?? undefined,
    terms: n(v.terms),
    startDate: t(v.startDate),
    endDate: t(v.endDate),
    seats: n(v.seats),
    fee: n(v.fee),
  });
export const courseFormFrom = (d: CourseDetails = {}) => ({
  courseType: d.courseType ?? '',
  department: d.department ?? '',
  medium: d.medium ?? 'English',
  durationValue: str(d.durationValue),
  durationUnit: d.durationUnit ?? 'Years',
  terms: str(d.terms),
  startDate: d.startDate ?? '',
  endDate: d.endDate ?? '',
  seats: str(d.seats),
  fee: str(d.fee),
});

export const subjectDetailsFrom = (v: SubjectFormValues): SubjectDetails =>
  clean({
    subjectType: t(v.subjectType),
    term: t(v.term),
    credits: n(v.credits),
    maxMarks: n(v.maxMarks),
    passMarks: n(v.passMarks),
    internalMarks: n(v.internalMarks),
    externalMarks: n(v.externalMarks),
    weeklyHours: n(v.weeklyHours),
    order: n(v.order),
  });
export const subjectFormFrom = (d: SubjectDetails = {}) => ({
  subjectType: d.subjectType ?? 'Theory',
  term: d.term ?? '',
  credits: str(d.credits),
  maxMarks: d.maxMarks == null ? '100' : String(d.maxMarks),
  passMarks: d.passMarks == null ? '35' : String(d.passMarks),
  internalMarks: str(d.internalMarks),
  externalMarks: str(d.externalMarks),
  weeklyHours: str(d.weeklyHours),
  order: str(d.order),
});

export const topicDetailsFrom = (v: TopicFormValues): TopicDetails =>
  clean({
    code: t(v.code),
    objectives: t(v.objectives),
    hours: n(v.hours),
    difficulty: v.difficulty,
    status: v.status === 'Active' ? ('active' as const) : ('inactive' as const),
  });
