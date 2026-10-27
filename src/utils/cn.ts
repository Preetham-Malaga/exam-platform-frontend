// PURPOSE: Joins conditional class names.
// WHY: Every component builds className strings; one tiny helper avoids repeating filter/join code.
// DEPENDS ON: Nothing.

export type ClassValue = string | false | null | undefined;
export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');
