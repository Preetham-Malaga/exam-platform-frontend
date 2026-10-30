// PURPOSE: Learning (Live Classes, Recorded Classes, Materials): types, API calls and query hooks.
// WHY: The three screens and their form pages share one module. Staff and students call the same endpoints; the server
//      (RLS, migration 046) returns only a student's own batch.
// DEPENDS ON: lib/api.ts, TanStack Query.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';

interface Common {
  id: string;
  title: string;
  courseId: string | null;
  courseName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  topicId: string | null;
  batchId: string;
  batchName: string | null;
  createdAt: string;
}
export interface LiveClass extends Common {
  teacherId: string | null;
  teacherName: string | null;
  agenda: string | null;
  startsAt: string;
  durationMinutes: number;
  platform: 'Zoom' | 'Google Meet' | 'Microsoft Teams' | 'Other';
  meetingLink: string;
  meetingId: string | null;
  passcode: string | null;
  willRecord: boolean;
  status: 'scheduled' | 'cancelled';
  hasRecording: boolean;
}
export interface Recording extends Common {
  teacherId: string | null;
  teacherName: string | null;
  source: 'YouTube' | 'Vimeo' | 'Google Drive' | 'Other link';
  videoUrl: string;
  duration: string | null;
  liveClassId: string | null;
  description: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  allowDownload: boolean;
  status: 'draft' | 'published';
}
export interface Material extends Common {
  materialType:
    'Notes' | 'Slides' | 'Question paper' | 'Assignment' | 'Syllabus' | 'Reference' | 'Other';
  linkUrl: string;
  description: string | null;
  availableFrom: string | null;
  allowDownload: boolean;
  status: 'draft' | 'published';
}
export type LearningKind = 'live-classes' | 'recordings' | 'materials';
type Item<K extends LearningKind> = K extends 'live-classes'
  ? LiveClass
  : K extends 'recordings'
    ? Recording
    : Material;
export type LearningBody = Record<string, unknown>;

const P = API_PREFIX;
export const learningService = {
  list: <K extends LearningKind>(kind: K, q: Record<string, string> = {}) =>
    api.get<{ items: Array<Item<K>> }>(`${P}/${kind}?${new URLSearchParams(q).toString()}`),
  create: (kind: LearningKind, b: LearningBody) => api.post<{ id: string }>(`${P}/${kind}`, b),
  update: (kind: LearningKind, id: string, b: LearningBody) =>
    api.patch<{ id: string }>(`${P}/${kind}/${id}`, b),
  remove: (kind: LearningKind, id: string) => api.delete<{ deleted: true }>(`${P}/${kind}/${id}`),
};

const KEY = ['learning'] as const;
export const useLearning = <K extends LearningKind>(kind: K, q: Record<string, string> = {}) =>
  useQuery({ queryKey: [...KEY, kind, q], queryFn: () => learningService.list(kind, q) });
export function useLearningMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** live: from 10 minutes before the start until the end; past after the end. */
export function liveState(l: Pick<LiveClass, 'startsAt' | 'durationMinutes'>, now: number) {
  const start = new Date(l.startsAt).getTime();
  const end = start + l.durationMinutes * 60_000;
  if (now > end) return 'past' as const;
  if (now >= start - 10 * 60_000) return 'live' as const;
  return 'upcoming' as const;
}
