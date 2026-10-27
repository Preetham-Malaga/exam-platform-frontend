// PURPOSE: Small pieces shared by the academic pages: API error text and the row action menu.
// WHY: Every academic screen shows server messages (e.g. "This unit still has courses ...") the same way.
// DEPENDS ON: lib/api.ts, components/ui/Dropdown.tsx, components/ui/Icon.tsx.

import { Dropdown, type MenuItem } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { ApiClientError } from '@/lib/api';

// eslint-disable-next-line react-refresh/only-export-components -- tiny helper shared with the pages
export const errorText = (e: unknown): string =>
  e instanceof ApiClientError ? e.message : 'Something went wrong. Please try again.';

/** "Edit" / "Delete" menu for a row; renders nothing when the caller may do neither. */
export function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
}) {
  const items: MenuItem[] = [];
  if (onEdit) items.push({ label: 'Edit', onSelect: onEdit });
  if (onDelete) items.push({ label: 'Delete', danger: true, onSelect: onDelete });
  if (!items.length) return null;
  return <Dropdown label={`Actions for ${label}`} trigger={<Icon name="more" />} items={items} />;
}
