// PURPOSE: Decides where a signed-in user lands, and which "return to" paths are safe.
// WHY: One place to change when later phases add the role dashboards; also blocks open-redirect tricks in ?from= values.
// DEPENDS ON: types/auth.ts.

import type { MeResponse } from '@/types/auth';

/** Landing page after sign-in. Phase 5: everyone lands on /app; later phases send roles to their dashboards. */
export function homePathFor(
  _me: Pick<MeResponse, 'isPlatformAdmin' | 'roles' | 'organization'> | null,
): string {
  return '/app';
}

/** Only same-site absolute paths are allowed (blocks "//evil.com" and "https://evil.com"). */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (value.startsWith('/login') || value.startsWith('/register')) return null;
  return value;
}
