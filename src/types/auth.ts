// PURPOSE: TypeScript shapes for authentication endpoints (must match the backend contract).
// WHY: Context, guards and pages share one definition of "who is signed in".
// DEPENDS ON: Nothing.

export interface MeOrganization {
  id: string;
  code: string;
  name: string;
  status: string;
}
export interface MeScope {
  scopeType: 'course' | 'academic_unit' | 'subject';
  scopeId: string;
  name: string | null;
}

export interface MeResponse {
  user: { id: string; email: string; fullName: string };
  isPlatformAdmin: boolean;
  organization: MeOrganization | null;
  roles: string[];
  permissions: string[];
  scopes: MeScope[];
  studentId: string | null;
}

export type InstitutionType = 'engineering' | 'degree' | 'school' | 'mba' | 'coaching' | 'training';

export interface RegisterRequest {
  organizationName: string;
  institutionType: InstitutionType;
  ownerName: string;
  email: string;
  password: string;
  city?: string;
  state?: string;
  mobile?: string;
  heardFrom?: string;
  acceptTerms?: true;
}
export interface RegisterResponse {
  organizationCode: string;
  emailVerificationRequired: boolean;
}

export type SignInResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'invalid_credentials' | 'email_not_verified' | 'rate_limited' | 'unknown';
    };
