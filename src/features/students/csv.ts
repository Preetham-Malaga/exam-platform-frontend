// PURPOSE: Reads a students CSV (as saved by Excel / Google Sheets) into import rows, and builds the template file.
// WHY: The import runs in the browser so the API receives clean JSON; headers are matched leniently ("Roll No", "roll_number").
// DEPENDS ON: types/student.ts.

import type { ImportRow } from '@/types/student';

/** RFC 4180 CSV: quoted fields, "" escapes, commas/newlines inside quotes, CRLF or LF, optional UTF-8 BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // Excel's UTF-8 byte-order mark
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  // drop completely empty lines (e.g. trailing ones)
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const HEADERS: Record<keyof ImportRow, string[]> = {
  rollNumber: ['rollnumber', 'rollno', 'roll', 'registrationnumber', 'admissionnumber'],
  fullName: ['fullname', 'name', 'studentname'],
  email: ['email', 'emailaddress', 'mail'],
  phone: ['phone', 'mobile', 'phonenumber', 'contact'],
  unitCode: ['unitcode', 'unit'],
};
const normalize = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '');

export interface ParsedFile {
  rows: ImportRow[];
  /** Missing required columns or an empty file; nothing can be imported. */
  error: string | null;
}

/** Maps the header line to fields; values are trimmed and blank cells left out. */
export function toImportRows(text: string): ParsedFile {
  const [header, ...data] = parseCsv(text);
  if (!header) return { rows: [], error: 'The file is empty.' };
  const index: Partial<Record<keyof ImportRow, number>> = {};
  header.forEach((h, i) => {
    const n = normalize(h);
    for (const [field, names] of Object.entries(HEADERS) as Array<[keyof ImportRow, string[]]>)
      if (index[field] === undefined && names.includes(n)) index[field] = i;
  });
  const missing = (['rollNumber', 'fullName'] as const).filter((f) => index[f] === undefined);
  if (missing.length)
    return {
      rows: [],
      error: `Missing column(s): ${missing.map((m) => (m === 'rollNumber' ? 'roll_number' : 'full_name')).join(', ')}. Use the template.`,
    };
  if (!data.length) return { rows: [], error: 'The file has a header line but no students.' };
  const rows = data.map((cells) => {
    const row: Record<string, string> = {};
    for (const [field, i] of Object.entries(index)) {
      const v = (cells[i!] ?? '').trim();
      if (v !== '' || field === 'rollNumber' || field === 'fullName') row[field] = v;
    }
    return row as unknown as ImportRow;
  });
  return { rows, error: null };
}

export const TEMPLATE_CSV =
  'roll_number,full_name,email,phone,unit_code\r\n21EE001,Asha Verma,asha@example.com,9876543210,EEE-Y2\r\n';
