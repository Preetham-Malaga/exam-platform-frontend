// PURPOSE: API calls for organization users, roles and the role catalogue.
// WHY: Pages never build URLs or parse envelopes.
// DEPENDS ON: lib/api.ts, types/user.ts.

import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';
import type {
  AssignableRole,
  InviteAdminBody,
  RoleInfo,
  UserList,
  UserListParams,
} from '@/types/user';

export const userService = {
  list(p: UserListParams) {
    const q = new URLSearchParams({ page: String(p.page), pageSize: String(p.pageSize) });
    if (p.search) q.set('search', p.search);
    if (p.role) q.set('role', p.role);
    if (p.sort) q.set('sort', p.sort);
    if (p.order) q.set('order', p.order);
    return api.get<UserList>(`${API_PREFIX}/users?${q.toString()}`);
  },
  inviteAdmin: (body: InviteAdminBody) =>
    api.post<{ userId: string }>(`${API_PREFIX}/users/admins`, body),
  changeRole: (userId: string, role: AssignableRole) =>
    api.put<{ userId: string; role: string }>(`${API_PREFIX}/users/${userId}/role`, { role }),
  changeStatus: (userId: string, status: 'active' | 'suspended') =>
    api.patch<{ userId: string; status: string }>(`${API_PREFIX}/users/${userId}/status`, {
      status,
    }),
  roles: () => api.get<{ roles: RoleInfo[] }>(`${API_PREFIX}/roles`),
};
