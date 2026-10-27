// PURPOSE: TypeScript shapes for organization members and roles (must match the backend contract).
// WHY: Services, hooks and pages share one definition.
// DEPENDS ON: Nothing.

import type { Paginated } from './api';

export interface OrgUser {
  userId: string;
  email: string;
  fullName: string;
  status: 'active' | 'suspended' | 'invited' | 'removed';
  joinedAt: string;
  roles: string[];
}

export interface UserListParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  sort?: 'fullName' | 'email' | 'joinedAt';
  order?: 'asc' | 'desc';
}

export type UserList = Paginated<OrgUser>;
export interface InviteAdminBody {
  email: string;
  fullName: string;
}
export type AssignableRole = 'ORGANIZATION_ADMIN' | 'TEACHER' | 'STUDENT';

export interface RoleInfo {
  code: string;
  name: string;
  permissions: string[];
}
