// PURPOSE: TanStack Query hooks for levels, the unit tree, courses, subjects and topics, plus their mutations.
// WHY: One cache root ('academic'): any change refreshes every academic list, because counts and names appear across
//      screens (a renamed unit shows on courses, a new topic changes a subject's topic count).
// DEPENDS ON: services/academicService.ts.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicService } from '@/services/academicService';
import type { CatalogListParams } from '@/types/academic';

export const academicKey = ['academic'] as const;

export const useLevels = () =>
  useQuery({ queryKey: [...academicKey, 'levels'], queryFn: academicService.levels });

export const useUnitTree = () =>
  useQuery({ queryKey: [...academicKey, 'tree'], queryFn: academicService.tree });

export const useCourses = (p: CatalogListParams, enabled = true) =>
  useQuery({
    queryKey: [...academicKey, 'courses', p],
    queryFn: () => academicService.courses(p),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useSubjects = (p: CatalogListParams, enabled = true) =>
  useQuery({
    queryKey: [...academicKey, 'subjects', p],
    queryFn: () => academicService.subjects(p),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useTopics = (p: CatalogListParams, enabled = true) =>
  useQuery({
    queryKey: [...academicKey, 'topics', p],
    queryFn: () => academicService.topics(p),
    placeholderData: keepPreviousData,
    enabled,
  });

/** A mutation that refreshes every academic query when it succeeds. */
export function useAcademicMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: academicKey }),
  });
}
