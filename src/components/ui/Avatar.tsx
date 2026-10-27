// PURPOSE: Circular avatar showing initials.
// WHY: Topbar and lists show who someone is without needing image uploads.
// DEPENDS ON: utils/cn.ts.

import { cn } from '@/utils/cn';

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={name}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-white',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
