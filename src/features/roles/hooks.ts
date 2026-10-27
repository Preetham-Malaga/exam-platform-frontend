// PURPOSE: TanStack Query hook for the role/permission catalogue.
// WHY: The permission matrix page reads the real roles from the server instead of a hard-coded table.
// DEPENDS ON: services/userService.ts.

import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: userService.roles, staleTime: 5 * 60_000 });
}
