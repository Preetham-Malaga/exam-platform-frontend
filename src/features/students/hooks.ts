// PURPOSE: TanStack Query hooks for the students list and every student action.
// WHY: After any change the student list refreshes; invitations and removals also change the Users list,
//      and placements change unit counts on the academic screens.
// DEPENDS ON: services/studentService.ts, features/users/hooks.ts, features/academic/hooks.ts (cache keys).

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicKey } from '@/features/academic/hooks';
import { usersKey } from '@/features/users/hooks';
import { studentService } from '@/services/studentService';
import type { StudentListParams } from '@/types/student';

export const studentsKey = ['students'] as const;

export const useStudents = (p: StudentListParams) =>
  useQuery({
    queryKey: [...studentsKey, p],
    queryFn: () => studentService.list(p),
    placeholderData: keepPreviousData,
  });

export function useStudentMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Refresh lists in the background: the form closes as soon as the save succeeds instead of waiting for the reload.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: studentsKey });
      void qc.invalidateQueries({ queryKey: usersKey });
      void qc.invalidateQueries({ queryKey: academicKey });
    },
  });
}
