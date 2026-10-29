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
