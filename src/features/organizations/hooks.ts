// PURPOSE: TanStack Query hooks for the current organization (read, update profile, update branding).
// WHY: Caching, loading/error state and refreshing after an edit are handled once, not in every page.
// DEPENDS ON: services/organizationService.ts, @tanstack/react-query.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '@/services/organizationService';
import type { OrganizationUpdate, SettingsUpdate } from '@/types/organization';

export const organizationKey = ['organization', 'current'] as const;

export function useOrganization() {
  return useQuery({ queryKey: organizationKey, queryFn: organizationService.get });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrganizationUpdate) => organizationService.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKey }),
  });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsUpdate) => organizationService.updateSettings(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKey }),
  });
}
