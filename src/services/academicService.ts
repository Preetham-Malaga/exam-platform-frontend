// PURPOSE: API calls for the academic structure: levels, units (and the whole tree), courses, subjects, topics.
// WHY: Pages never build URLs or parse envelopes. The organization is never sent: the API derives it from the session.
// DEPENDS ON: lib/api.ts, types/academic.ts.

import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';
import type {
  AcademicLevel,
  AcademicUnit,
  CatalogListParams,
  CatalogTree,
  Course,
  CourseBody,
  CourseList,
  Subject,
  SubjectBody,
  SubjectList,
  Topic,
  TopicBody,
  TopicList,
  UnitBody,
  UnitTree,
} from '@/types/academic';

const query = (p: CatalogListParams) => {
  const q = new URLSearchParams({ page: String(p.page), pageSize: String(p.pageSize) });
  for (const k of [
    'search',
    'sort',
    'order',
    'status',
    'academicUnitId',
    'courseId',
    'subjectId',
  ] as const) {
    const v = p[k];
    if (v) q.set(k, v);
  }
  return q.toString();
};
const P = API_PREFIX;

export const academicService = {
  // levels
  levels: () => api.get<{ items: AcademicLevel[] }>(`${P}/academic-levels`),
  createLevel: (name: string) => api.post<AcademicLevel>(`${P}/academic-levels`, { name }),
  renameLevel: (id: string, name: string) =>
    api.patch<AcademicLevel>(`${P}/academic-levels/${id}`, { name }),
  reorderLevels: (levelIds: string[]) =>
    api.put<{ items: AcademicLevel[] }>(`${P}/academic-levels/order`, { levelIds }),
  deleteLevel: (id: string) => api.delete<{ deleted: true }>(`${P}/academic-levels/${id}`),

  // units
  tree: () => api.get<UnitTree>(`${P}/academic-units/tree`),
  createUnit: (b: UnitBody) => api.post<AcademicUnit>(`${P}/academic-units`, b),
  updateUnit: (id: string, b: Partial<UnitBody> & { status?: 'active' | 'inactive' }) =>
    api.patch<AcademicUnit>(`${P}/academic-units/${id}`, b),
  deleteUnit: (id: string) => api.delete<{ deleted: true }>(`${P}/academic-units/${id}`),

  // courses
  courses: (p: CatalogListParams) => api.get<CourseList>(`${P}/courses?${query(p)}`),
  catalogTree: () => api.get<CatalogTree>(`${P}/catalog/tree`),
  course: (id: string) => api.get<Course>(`${P}/courses/${id}`),
  subject: (id: string) => api.get<Subject>(`${P}/subjects/${id}`),
  topic: (id: string) => api.get<Topic>(`${P}/topics/${id}`),
  createCourse: (b: CourseBody) => api.post<Course>(`${P}/courses`, b),
  updateCourse: (id: string, b: Partial<CourseBody> & { status?: 'active' | 'inactive' }) =>
    api.patch<Course>(`${P}/courses/${id}`, b),
  deleteCourse: (id: string) => api.delete<{ deleted: true }>(`${P}/courses/${id}`),

  // subjects
  subjects: (p: CatalogListParams) => api.get<SubjectList>(`${P}/subjects?${query(p)}`),
  createSubject: (b: SubjectBody) => api.post<Subject>(`${P}/subjects`, b),
  updateSubject: (id: string, b: Partial<SubjectBody> & { status?: 'active' | 'inactive' }) =>
    api.patch<Subject>(`${P}/subjects/${id}`, b),
  deleteSubject: (id: string) => api.delete<{ deleted: true }>(`${P}/subjects/${id}`),

  // topics
  topics: (p: CatalogListParams) => api.get<TopicList>(`${P}/topics?${query(p)}`),
  createTopic: (b: TopicBody) => api.post<Topic>(`${P}/topics`, b),
  updateTopic: (id: string, b: { name?: string; position?: number }) =>
    api.patch<Topic>(`${P}/topics/${id}`, b),
  deleteTopic: (id: string) => api.delete<{ deleted: true }>(`${P}/topics/${id}`),
};
