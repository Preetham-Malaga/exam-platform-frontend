// PURPOSE: TypeScript shapes for the academic structure API (levels, units, courses, subjects, topics).
// WHY: Services, hooks and pages share one definition; it mirrors the backend responses (openapi/openapi.yaml).
// DEPENDS ON: types/api.ts.

import type { Paginated } from './api';

export type ActiveStatus = 'active' | 'inactive';

export interface AcademicLevel {
  id: string;
  code: string;
  name: string;
  position: number;
  unitCount: number;
}

/** A node as returned by GET /academic-units/tree (the client nests by parentId). */
export interface UnitNode {
  id: string;
  code: string;
  name: string;
  status: ActiveStatus;
  levelId: string;
  parentId: string | null;
}

export interface AcademicUnit extends UnitNode {
  levelName: string;
  levelPosition: number;
  parentName: string | null;
  childCount: number;
  subjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnitTree {
  levels: AcademicLevel[];
  units: UnitNode[];
  truncated: boolean;
}

/** Extra fields from the prototype forms, stored in the row's "details" object (migration 044). */
export interface CourseDetails {
  courseType?: string;
  department?: string;
  medium?: string;
  durationValue?: number;
  durationUnit?: 'Months' | 'Years' | 'Semesters';
  terms?: number;
  startDate?: string;
  endDate?: string;
  seats?: number;
  fee?: number;
}
export interface SubjectDetails {
  subjectType?: string;
  term?: string;
  credits?: number;
  maxMarks?: number;
  passMarks?: number;
  internalMarks?: number;
  externalMarks?: number;
  weeklyHours?: number;
  order?: number;
}
export interface TopicDetails {
  code?: string;
  objectives?: string;
  hours?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: ActiveStatus;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ActiveStatus;
  details?: CourseDetails;
  academicUnitId: string | null;
  academicUnitName: string | null;
  subjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ActiveStatus;
  details?: SubjectDetails;
  courseId: string | null;
  courseName: string | null;
  academicUnitId: string | null;
  academicUnitName: string | null;
  topicCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  subjectName: string;
  name: string;
  position: number;
  details?: TopicDetails;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogListParams {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  status?: ActiveStatus;
  academicUnitId?: string;
  courseId?: string;
  subjectId?: string;
}

export type CourseList = Paginated<Course>;
export type SubjectList = Paginated<Subject>;
export type TopicList = Paginated<Topic>;

export interface UnitBody {
  levelId: string;
  parentId: string | null;
  code: string;
  name: string;
}
export interface CourseBody {
  code: string;
  name: string;
  description: string | null;
  academicUnitId?: string | null;
  details?: CourseDetails;
}
export interface SubjectBody {
  code: string;
  name: string;
  description: string | null;
  courseId: string | null;
  academicUnitId?: string | null;
  details?: SubjectDetails;
}
export interface TopicBody {
  subjectId: string;
  name: string;
  position?: number;
  details?: TopicDetails;
}

/** GET /catalog/tree: everything the Courses screen shows, in one call. */
export interface CatalogTree {
  courses: Array<{ id: string; code: string; name: string; status: ActiveStatus }>;
  subjects: Array<{
    id: string;
    code: string;
    name: string;
    status: ActiveStatus;
    courseId: string | null;
    questionCount: number;
  }>;
  topics: Array<{
    id: string;
    name: string;
    subjectId: string;
    position: number;
    questionCount: number;
  }>;
  truncated: boolean;
}
