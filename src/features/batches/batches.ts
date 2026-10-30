// PURPOSE: Batches (People › Batches): type, API calls, query hooks and the form rules (prototype SPEC.batch).
// WHY: One module for the batch screens and for the batch pickers on the student pages. Every change refreshes the batch
//      list and the student lists (a student's batch name is shown there).
// DEPENDS ON: lib/api.ts, TanStack Query, zod.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';

export interface Batch {
  id: string;
  code: string;
  name: string;
  courseId: string | null;
  courseName: string | null;
  academicYear: string | null;
  yearSem: string | null;
  section: string | null;
  mode: 'Offline' | 'Online' | 'Hybrid' | null;
  timing: 'Morning' | 'Afternoon' | 'Evening' | 'Weekend' | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  classTeacherId: string | null;
  classTeacherName: string | null;
  room: string | null;
  status: 'active' | 'inactive';
  studentCount: number;
}
export type BatchBody = Partial<
  Omit<Batch, 'id' | 'courseName' | 'classTeacherName' | 'studentCount'>
>;

const P = `${API_PREFIX}/batches`;
export const batchService = {
  list: () => api.get<{ items: Batch[]; studentsWithoutBatch: number }>(P),
  get: (id: string) => api.get<Batch>(`${P}/${id}`),
  create: (b: BatchBody) => api.post<Batch>(P, b),
  update: (id: string, b: BatchBody) => api.patch<Batch>(`${P}/${id}`, b),
  remove: (id: string) => api.delete<{ deleted: true }>(`${P}/${id}`),
};

const KEY = ['batches'] as const;
export const useBatches = (enabled = true) =>
  useQuery({ queryKey: KEY, queryFn: batchService.list, enabled });
export const useBatch = (id: string | undefined) =>
  useQuery({ queryKey: [...KEY, id], queryFn: () => batchService.get(id!), enabled: Boolean(id) });
export function useBatchMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export const ACADEMIC_YEARS = ['2025–26', '2026–27', '2027–28'] as const;
export const YEAR_SEMS = [
  '1st year',
  '2nd year',
  '3rd year',
  '4th year',
  ...Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`),
] as const;
export const MODES = ['Offline', 'Online', 'Hybrid'] as const;
export const TIMINGS = ['Morning', 'Afternoon', 'Evening', 'Weekend'] as const;

export const batchFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Enter batch name.')
      .max(80, 'Keep it to 80 characters or fewer.'),
    code: z
      .string()
      .trim()
      .min(1, 'Enter batch code.')
      .max(30, 'Keep it to 30 characters or fewer.')
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Use letters, numbers, ".", "_" or "-" (no spaces).'),
    courseId: z.string().min(1, 'Choose course.'),
    academicYear: z.string().min(1, 'Choose academic year.'),
    yearSem: z.string(),
    section: z.string().trim().max(10, 'Keep it to 10 characters or fewer.'),
    mode: z.string(),
    timing: z.string(),
    startDate: z.string().min(1, 'Enter start date.'),
    endDate: z.string(),
    capacity: z
      .string()
      .trim()
      .refine(
        (s) => s === '' || (/^\d+$/.test(s) && +s >= 1 && +s <= 1000),
        'Use a number from 1 to 1000.',
      ),
    classTeacherId: z.string(),
    room: z.string().trim().max(30, 'Keep it to 30 characters or fewer.'),
    status: z.enum(['Active', 'Inactive']),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'Must be on or after start date.',
  });
export type BatchFormValues = z.infer<typeof batchFormSchema>;

const orNull = (s: string) => (s.trim() === '' ? null : s.trim());
export const batchBodyFrom = (v: BatchFormValues): BatchBody => ({
  name: v.name,
  code: v.code.toUpperCase(),
  courseId: orNull(v.courseId),
  academicYear: orNull(v.academicYear),
  yearSem: orNull(v.yearSem),
  section: orNull(v.section),
  mode: orNull(v.mode) as Batch['mode'],
  timing: orNull(v.timing) as Batch['timing'],
  startDate: orNull(v.startDate),
  endDate: orNull(v.endDate),
  capacity: v.capacity ? Number(v.capacity) : null,
  classTeacherId: orNull(v.classTeacherId),
  room: orNull(v.room),
  status: v.status === 'Active' ? 'active' : 'inactive',
});
export const batchFormFrom = (b?: Batch): BatchFormValues => ({
  name: b?.name ?? '',
  code: b?.code ?? '',
  courseId: b?.courseId ?? '',
  academicYear: b?.academicYear ?? '2026–27',
  yearSem: b?.yearSem ?? '',
  section: b?.section ?? '',
  mode: b?.mode ?? 'Offline',
  timing: b?.timing ?? '',
  startDate: b?.startDate ?? '',
  endDate: b?.endDate ?? '',
  capacity: b?.capacity == null ? '' : String(b.capacity),
  classTeacherId: b?.classTeacherId ?? '',
  room: b?.room ?? '',
  status: b?.status === 'inactive' ? 'Inactive' : 'Active',
});
