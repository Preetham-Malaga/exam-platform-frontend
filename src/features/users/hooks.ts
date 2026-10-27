// PURPOSE: TanStack Query hooks for the users list and the role/status/invite actions.
// WHY: Caching, keeping the previous page visible while the next loads, and refreshing the list after each change.
// DEPENDS ON: services/userService.ts.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import type { AssignableRole, InviteAdminBody, UserListParams } from '@/types/user';

export const usersKey = ['users'] as const;

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: [...usersKey, params],
    queryFn: () => userService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useInviteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: InviteAdminBody) => userService.inviteAdmin(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useChangeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { userId: string; role: AssignableRole }) =>
      userService.changeRole(v.userId, v.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { userId: string; status: 'active' | 'suspended' }) =>
      userService.changeStatus(v.userId, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}
