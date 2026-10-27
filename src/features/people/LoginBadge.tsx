// PURPOSE: Shows whether a teacher/student can sign in (not invited, can sign in, locked ...).
// WHY: Teachers and students use the same membership states; one badge keeps both lists consistent.
// DEPENDS ON: components/ui/Badge.tsx.

import { Badge, type BadgeTone } from '@/components/ui/Badge';

const LOGIN: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: 'Can sign in', tone: 'success' },
  suspended: { label: 'Locked', tone: 'warning' },
  removed: { label: 'Removed', tone: 'neutral' },
  invited: { label: 'Invited', tone: 'info' },
};

export function LoginBadge({ userId, status }: { userId: string | null; status: string | null }) {
  if (!userId) return <Badge tone="neutral">Not invited</Badge>;
  const l = status ? LOGIN[status] : undefined;
  // A login exists but its state is hidden from this caller (e.g. teachers may not read memberships).
  return <Badge tone={l?.tone ?? 'info'}>{l?.label ?? 'Has login'}</Badge>;
}
