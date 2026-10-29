// PURPOSE: Suggests a short code from a name, as the prototype does while you type (autoCode).
// WHY: Course, subject, batch and exam forms fill the code from the name until the user types their own.
// DEPENDS ON: nothing.

/** "B.Tech Electrical" → "BTE": the code suggested from a name (prototype autoCode). */
export function autoCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const raw = words.length === 1 ? words[0]! : words.map((w) => w[0]).join('');
  return raw
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);
}
