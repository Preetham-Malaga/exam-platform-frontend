// PURPOSE: TypeScript shapes for the students API (records, import, invitation).
// WHY: Services, hooks and pages share one definition; it mirrors the backend responses (openapi/openapi.yaml).
// DEPENDS ON: types/api.ts.

import type { Paginated } from './api';

export interface Student {
  id: string;
  rollNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive';
  academicUnitId: string | null;
  academicUnitName: string | null;
  /** The linked login; null until the invitation is sent. */
  userId: string | null;
  /** Membership of the linked login (null without a login, or when the caller may not see logins). */
  accountStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StudentList = Paginated<Student>;

export interface StudentListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'active' | 'inactive';
  /** The unit and every unit below it. */
  academicUnitId?: string;
  unplaced?: boolean;
  sort?: 'rollNumber' | 'fullName' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateStudentBody {
  rollNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  academicUnitId: string | null;
  invite: boolean;
}

export type UpdateStudentBody = Partial<Omit<CreateStudentBody, 'invite'>> & {
  status?: 'active' | 'inactive';
};

export interface ImportRow {
  rollNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  unitCode?: string;
}

export interface ImportFailure {
  /** 1-based position in the rows that were sent. */
  row: number;
  rollNumber: string | null;
  code: string;
  message: string;
}

export interface ImportResult {
  total: number;
  created: number;
  failed: ImportFailure[];
  dryRun: boolean;
}
