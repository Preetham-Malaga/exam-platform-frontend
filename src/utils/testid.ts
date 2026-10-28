// PURPOSE: Helpers that derive related data-testid values (a field's -error/-hint, a menu item's id) from one given id.
// WHY: QA locators follow <page>-<section>-<element>-<type> (docs/locators.md); deriving them keeps the pairs consistent.
// DEPENDS ON: nothing. Used by the shared form, menu, table and layout components.

const CONTROL_SUFFIX = /-(input|select|textarea|checkbox|radio|toggle)$/;

/** "login-email-input" → "login-email", so the field's message ids become login-email-error / login-email-hint. */
export function testIdBase(testId: string | undefined): string | undefined {
  return testId?.replace(CONTROL_SUFFIX, '');
}

/** "Roles & Permissions" → "roles-permissions"; "/org/settings/permissions" → "org-settings-permissions". */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Sidebar link id from its route, area prefix dropped, group first when it has one:
 *  "/org/students" in group "people" → "nav-people-students-link"; "/org/dashboard" → "nav-dashboard-link".
 *  A route starting with the group's own name drops it: "/org/exams/published" in "exams" → "nav-exams-published-link". */
export function navTestId(to: string, group?: string): string {
  const parts = to.split('/').filter(Boolean);
  let rest = parts.length > 1 ? parts.slice(1) : parts;
  if (group && rest.length > 1 && rest[0] === group) rest = rest.slice(1);
  return `nav-${group ? `${group}-` : ''}${slug(rest.join('-'))}-link`;
}
