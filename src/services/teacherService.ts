// PURPOSE: API calls for teachers: list, detail (with scope), add/invite, edit, remove, replace scope.
// WHY: Pages never build URLs or parse envelopes. The organization comes from the session, never from the client.
// DEPENDS ON: lib/api.ts, types/teacher.ts.

import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';
import type {
  CreateTeacherBody,
  ScopeType,
  Teacher,
  TeacherDetail,
  TeacherList,
  TeacherListParams,
  TeacherScope,
  UpdateTeacherBody,
} from '@/types/teacher';

const P = `${API_PREFIX}/teachers`;

export const teacherService = {
  list(p: TeacherListParams) {
    const q = new URLSearchParams({ page: String(p.page), pageSize: String(p.pageSize) });
    for (const k of ['search', 'status', 'sort', 'order'] as const) {
      const v = p[k];
      if (v) q.set(k, v);
    }
    return api.get<TeacherList>(`${P}?${q.toString()}`);
  },
  get: (id: string) => api.get<TeacherDetail>(`${P}/${id}`),
  create: (b: CreateTeacherBody) => api.post<Teacher>(P, b),
  invite: (id: string) => api.post<Teacher>(`${P}/${id}/invite`),
  update: (id: string, b: UpdateTeacherBody) => api.patch<Teacher>(`${P}/${id}`, b),
  remove: (id: string) => api.delete<{ deleted: true }>(`${P}/${id}`),
  setScopes: (id: string, scopes: Array<{ scopeType: ScopeType; scopeId: string }>) =>
    api.put<{ teacherId: string; scopes: TeacherScope[] }>(`${P}/${id}/scopes`, { scopes }),
};
