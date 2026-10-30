// PURPOSE: API calls for students: list, add/invite, edit, remove, bulk import.
// WHY: Pages never build URLs or parse envelopes. The organization comes from the session, never from the client.
// DEPENDS ON: lib/api.ts, types/student.ts.

import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';
import type {
  CreateStudentBody,
  ImportResult,
  ImportRow,
  Student,
  StudentList,
  StudentListParams,
  UpdateStudentBody,
} from '@/types/student';

const P = `${API_PREFIX}/students`;
/** Server limit per import request. */
export const IMPORT_BATCH = 500;

export const studentService = {
  list(p: StudentListParams) {
    const q = new URLSearchParams({ page: String(p.page), pageSize: String(p.pageSize) });
    for (const k of ['search', 'status', 'academicUnitId', 'batchId', 'sort', 'order'] as const) {
      const v = p[k];
      if (v) q.set(k, v);
    }
    if (p.unplaced) q.set('unplaced', 'true');
    if (p.noBatch) q.set('noBatch', 'true');
    return api.get<StudentList>(`${P}?${q.toString()}`);
  },
  get: (id: string) => api.get<Student>(`${P}/${id}`),
  create: (b: CreateStudentBody) => api.post<Student>(P, b),
  invite: (id: string) => api.post<Student>(`${P}/${id}/invite`),
  update: (id: string, b: UpdateStudentBody) => api.patch<Student>(`${P}/${id}`, b),
  remove: (id: string) => api.delete<{ deleted: true }>(`${P}/${id}`),

  /** Sends the rows in batches of 500 and merges the reports (row numbers stay relative to the whole file). */
  async importAll(rows: ImportRow[], dryRun: boolean): Promise<ImportResult> {
    const merged: ImportResult = { total: rows.length, created: 0, failed: [], dryRun };
    for (let start = 0; start < rows.length; start += IMPORT_BATCH) {
      const r = await api.post<ImportResult>(`${P}/import`, {
        rows: rows.slice(start, start + IMPORT_BATCH),
        dryRun,
      });
      merged.created += r.created;
      merged.failed.push(...r.failed.map((f) => ({ ...f, row: f.row + start })));
    }
    return merged;
  },
};
