// PURPOSE: TypeScript shapes for the teachers API (records, invitations, scope).
// WHY: Services, hooks and pages share one definition; it mirrors the backend responses (openapi/openapi.yaml).
// DEPENDS ON: types/api.ts.

import type { Paginated } from './api';

export type ScopeType = 'subject' | 'course' | 'academic_unit';

export interface Teacher {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive';
  /** The linked login; null until the invitation is sent. */
  userId: string | null;
  /** Membership of the linked login: active, suspended ... (null without a login). */
  accountStatus: string | null;
  scopeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherScope {
  scopeType: ScopeType;
  scopeId: string;
  name: string | null;
  code: string | null;
  /** false when the subject/course/unit was deleted after it was assigned. */
  active: boolean;
}

export interface TeacherDetail extends Teacher {
  scopes: TeacherScope[];
}

export type TeacherList = Paginated<Teacher>;

export interface TeacherListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'active' | 'inactive';
  sort?: 'fullName' | 'employeeCode' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface CreateTeacherBody {
  employeeCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  invite: boolean;
}

export type UpdateTeacherBody = Partial<Omit<CreateTeacherBody, 'invite'>> & {
  status?: 'active' | 'inactive';
};
