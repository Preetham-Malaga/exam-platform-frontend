// PURPOSE: Date and time formatting in the prototype's style: 28-10-2026 and 7:05 pm (fmtDate / fmtTime).
// WHY: Every table, window and schedule shows dates the same way. The organization's chosen format (Settings ›
//      Date & time, step 10) will be passed in here; until then DD-MM-YYYY and 12-hour are the defaults.
// DEPENDS ON: nothing.

export type DateFormat = 'DD-MM-YYYY' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD MMM YYYY';
/** The organization's choice (Settings › Date & time), set once after sign-in by AppLayout. */
const prefs: { dateFormat: DateFormat; timeFormat: '12' | '24' } = {
  dateFormat: 'DD-MM-YYYY',
  timeFormat: '12',
};
export function setDatePreferences(p: { dateFormat?: DateFormat; timeFormat?: '12' | '24' }): void {
  if (p.dateFormat) prefs.dateFormat = p.dateFormat;
  if (p.timeFormat) prefs.timeFormat = p.timeFormat;
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-28" or an ISO timestamp → "28-10-2026" (in the browser's time zone for timestamps). */
export function fmtDate(
  value: string | Date | null | undefined,
  format: DateFormat = prefs.dateFormat,
) {
  if (!value) return '—';
  let y: string, m: string, d: string;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
    [y, m, d] = value.split('-') as [string, string, string];
  else {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '—';
    y = String(dt.getFullYear());
    m = String(dt.getMonth() + 1).padStart(2, '0');
    d = String(dt.getDate()).padStart(2, '0');
  }
  switch (format) {
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`;
    case 'MM/DD/YYYY':
      return `${m}/${d}/${y}`;
    case 'YYYY-MM-DD':
      return `${y}-${m}-${d}`;
    case 'DD MMM YYYY':
      return `${d} ${MON[Number(m) - 1]} ${y}`;
    default:
      return `${d}-${m}-${y}`;
  }
}

/** ISO timestamp → "7:05 pm" (12-hour) or "19:05" (24-hour). */
export function fmtTime(
  value: string | Date | null | undefined,
  hours: '12' | '24' = prefs.timeFormat,
) {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const h = dt.getHours();
  const mm = String(dt.getMinutes()).padStart(2, '0');
  if (hours === '24') return `${String(h).padStart(2, '0')}:${mm}`;
  return `${h % 12 || 12}:${mm} ${h >= 12 ? 'pm' : 'am'}`;
}

/** Indian digit grouping: 1,23,456. */
export const fmtNumber = (n: number) => n.toLocaleString('en-IN');
