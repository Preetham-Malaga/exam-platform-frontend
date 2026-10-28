// PURPOSE: TanStack Query hooks for the teachers list/detail and every teacher action.
// WHY: After any change the teacher list and detail refresh; an invitation also changes the Users list.
// DEPENDS ON: services/teacherService.ts, features/users/hooks.ts (users cache key).

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersKey } from '@/features/users/hooks';
import { teacherService } from '@/services/teacherService';
import type { TeacherListParams } from '@/types/teacher';

export const teachersKey = ['teachers'] as const;

export const useTeachers = (p: TeacherListParams) =>
  useQuery({
    queryKey: [...teachersKey, 'list', p],
    queryFn: () => teacherService.list(p),
    placeholderData: keepPreviousData,
  });

export const useTeacher = (id: string | null) =>
  useQuery({
    queryKey: [...teachersKey, 'detail', id],
    queryFn: () => teacherService.get(id!),
    enabled: Boolean(id),
  });

/** A mutation that refreshes teachers (and users, whose roles/statuses an invitation or removal changes). */
export function useTeacherMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Refresh lists in the background: the form closes as soon as the save succeeds instead of waiting for the reload.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teachersKey });
      void qc.invalidateQueries({ queryKey: usersKey });
    },
  });
}
