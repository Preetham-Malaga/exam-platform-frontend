// PURPOSE: API calls for the current organization (profile and branding).
// WHY: Pages never build URLs or parse envelopes; they call a service and get typed data.
// DEPENDS ON: lib/api.ts, types/organization.ts. Used by features/organizations/hooks.ts.

import { api } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';
import type { Organization, OrganizationUpdate, SettingsUpdate } from '@/types/organization';

const base = `${API_PREFIX}/organizations/current`;

export const organizationService = {
  get: () => api.get<Organization>(base),
  update: (body: OrganizationUpdate) => api.patch<{ updated: boolean }>(base, body),
  updateSettings: (body: SettingsUpdate) =>
    api.patch<{ branding: Organization['branding']; timezone: string }>(`${base}/settings`, body),
};
