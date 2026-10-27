// PURPOSE: TypeScript shapes of the organization endpoints (must match the backend OpenAPI contract).
// WHY: Services, hooks and pages share one definition, so a contract change shows up as a compile error.
// DEPENDS ON: Nothing.

export interface Branding {
  primaryColor?: string;
  tagline?: string;
}

export interface Organization {
  id: string;
  orgCode: string;
  name: string;
  institutionType: 'engineering' | 'degree' | 'school' | 'mba' | 'coaching' | 'training';
  status: 'pending_email' | 'active' | 'suspended' | 'closed';
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  branding: Branding;
  timezone: string;
  createdAt: string;
}

export interface OrganizationUpdate {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
}
export interface SettingsUpdate {
  branding?: Branding;
  timezone?: string;
}
