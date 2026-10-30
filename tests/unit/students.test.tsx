// Phase 10: Students page, CSV parsing and import (check, then import) with the real routes and providers.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCsv, toImportRows } from '@/features/students/csv';
import { studentService } from '@/services/studentService';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import { PERMS, meAs, mockApi, renderRoute, type Handler } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const S = (id: string, fullName: string, over: Record<string, unknown> = {}) => ({
  id,
  rollNumber: `21EE${id}`,
  fullName,
  email: `${fullName.split(' ')[0]!.toLowerCase()}@college.test`,
  phone: null,
  status: 'active',
  academicUnitId: 'u2',
  academicUnitName: 'EEE',
  userId: `user-${id}`,
  accountStatus: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const students = [
  S('001', 'Anita Verma'),
  S('002', 'Rahul Sen', { userId: null, accountStatus: null }),
  S('003', 'Priya Das', {
    academicUnitId: null,
    academicUnitName: null,
    email: null,
    userId: null,
    accountStatus: null,
  }),
];
const page = <X,>(items: X[]) => ({
  items,
  pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
});
const tree = {
  levels: [],
  units: [
    { id: 'u1', code: 'BT', name: 'B.Tech', status: 'active', levelId: 'l1', parentId: null },
    { id: 'u2', code: 'EEE', name: 'EEE', status: 'active', levelId: 'l2', parentId: 'u1' },
  ],
  truncated: false,
};

let calls: ReturnType<typeof mockApi>;
const called = (key: string) => calls.filter((c) => c.key === key);
const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

function setup(role: keyof typeof PERMS, extra: Record<string, Handler> = {}) {
  resetFakeSupabase(fakeSession());
  calls = mockApi({
    'GET /api/v1/me': () => ({ data: meAs(role) }),
    'GET /api/v1/students': () => ({ data: page(students) }),
    'GET /api/v1/academic-units/tree': () => ({ data: tree }),
    ...extra,
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('CSV reading', () => {
  it('handles quotes, commas and newlines inside quotes, CRLF and a byte-order mark', () => {
    const text = `${String.fromCharCode(0xfeff)}a,b\r\n"x, y","say ""hi""\nthere"\r\n\r\n`;
    expect(parseCsv(text)).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
    ]);
  });

  it('matches common header names and leaves blank cells out', () => {
    const r = toImportRows(
      'Roll No,Name,E-mail,Mobile,Unit Code\n21EE001, Anita Verma ,,98765,EEE\n',
    );
    expect(r).toEqual({
      error: null,
      rows: [{ rollNumber: '21EE001', fullName: 'Anita Verma', phone: '98765', unitCode: 'EEE' }],
    });
  });

  it('explains what is wrong with an unusable file', () => {
    expect(toImportRows('').error).toBe('The file is empty.');
    expect(toImportRows('name,email\nAsha,a@b.c\n').error).toMatch(
      /Missing column\(s\): roll_number/,
    );
    expect(toImportRows('roll_number,full_name\n').error).toMatch(/no students/);
  });

  it('sends big files in batches of 500 and keeps row numbers relative to the whole file', async () => {
    resetFakeSupabase(fakeSession()); // the API client reads the access token from the (fake) Supabase session
    const sent: number[] = [];
    mockApi({
      'POST /api/v1/students/import': ({ body }) => {
        sent.push(body.rows.length);
        return {
          data: {
            total: body.rows.length,
            created: body.rows.length - 1,
            failed: [
              { row: 1, rollNumber: body.rows[0].rollNumber, code: 'DUPLICATE', message: 'x' },
            ],
            dryRun: body.dryRun,
          },
        };
      },
    });
    const rows = Array.from({ length: 1201 }, (_, i) => ({
      rollNumber: `R${i}`,
      fullName: 'Someone',
    }));
    const r = await studentService.importAll(rows, true);
    expect(sent).toEqual([500, 500, 201]);
    expect(r).toMatchObject({ total: 1201, created: 1198, dryRun: true });
    expect(r.failed.map((f) => [f.row, f.rollNumber])).toEqual([
      [1, 'R0'],
      [501, 'R500'],
      [1001, 'R1000'],
    ]);
  });
});

describe('Students page', () => {
  it('lists students with unit and login state', async () => {
    setup('ADMIN');
    renderRoute('/org/students');
    expect(await screen.findByText('Anita Verma')).toBeInTheDocument();
    expect(within(rowFor('Anita Verma')).getByText('Can sign in')).toBeInTheDocument();
    expect(within(rowFor('Anita Verma')).getByText('EEE')).toBeInTheDocument();
    expect(within(rowFor('Rahul Sen')).getByText('Not invited')).toBeInTheDocument();
    expect(within(rowFor('Priya Das')).getByText('No e-mail')).toBeInTheDocument();
  });

  it('filters by unit (including sub-units on the server) and by "not placed yet"', async () => {
    setup('OWNER');
    renderRoute('/org/students');
    await screen.findByText('Anita Verma');
    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'B.Tech');
    await waitFor(() =>
      expect(called('GET /api/v1/students').at(-1)!.query).toMatchObject({ academicUnitId: 'u1' }),
    );
    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'Not placed yet');
    await waitFor(() =>
      expect(called('GET /api/v1/students').at(-1)!.query).toMatchObject({ unplaced: 'true' }),
    );
    expect(called('GET /api/v1/students').at(-1)!.query).not.toHaveProperty('academicUnitId');
  });

  it('invitation is offered only to students with an e-mail and no login', async () => {
    setup('OWNER');
    renderRoute('/org/students');
    await screen.findByText('Anita Verma');
    const items = async (name: string) => {
      await userEvent.click(
        within(rowFor(name)).getByRole('button', { name: `Actions for ${name}` }),
      );
      const out = within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((i) => i.textContent);
      await userEvent.keyboard('{Escape}');
      return out;
    };
    expect(await items('Anita Verma')).toEqual(['Edit', 'Remove']);
    expect(await items('Rahul Sen')).toEqual(['Edit', 'Send invitation', 'Remove']);
    expect(await items('Priya Das')).toEqual(['Edit', 'Remove']);
  });

  it('adds a student on its own page with education and guardian details', async () => {
    setup('OWNER', {
      'POST /api/v1/students': ({ body }) => ({
        status: 201,
        data: { ...S('009', body.fullName), details: body.details },
      }),
      'GET /api/v1/batches': () => ({ data: { items: [], studentsWithoutBatch: 0 } }),
    });
    renderRoute('/org/students');
    await screen.findByText('Anita Verma');
    await userEvent.click(screen.getByTestId('students-add-btn'));
    await screen.findByTestId('page-form-student');
    await userEvent.click(screen.getByTestId('student-form-save-btn'));
    expect(await screen.findByTestId('student-form-error-summary')).toHaveTextContent(
      'Fix 2 fields',
    );
    await userEvent.type(screen.getByTestId('student-form-full-name-input'), 'Kiran Rao');
    await userEvent.type(screen.getByTestId('student-form-roll-number-input'), '21EE009');
    await userEvent.selectOptions(screen.getByTestId('student-form-gender-select'), 'Female');
    await userEvent.type(screen.getByTestId('student-form-dob-input'), '2006-05-01');
    await userEvent.type(screen.getByTestId('student-form-board-input'), 'CBSE');
    await userEvent.type(screen.getByTestId('student-form-year-of-passing-input'), '2024');
    await userEvent.type(screen.getByTestId('student-form-previous-result-input'), '91.5');
    await userEvent.type(screen.getByTestId('student-form-guardian-name-input'), 'Suresh Rao');
    await userEvent.type(screen.getByTestId('student-form-guardian-mobile-input'), '12345');
    await waitFor(() =>
      expect(screen.getByTestId('student-form-unit-select')).toContainHTML('B.Tech / EEE'),
    );
    await userEvent.selectOptions(screen.getByTestId('student-form-unit-select'), 'B.Tech / EEE');
    await userEvent.click(screen.getByTestId('student-form-save-btn'));
    expect(await screen.findByTestId('student-form-guardian-mobile-error')).toHaveTextContent(
      '10-digit',
    );
    await userEvent.clear(screen.getByTestId('student-form-guardian-mobile-input'));
    await userEvent.type(screen.getByTestId('student-form-guardian-mobile-input'), '98480 12345');
    await userEvent.click(screen.getByTestId('student-form-save-btn'));
    await waitFor(() => expect(called('POST /api/v1/students')).toHaveLength(1));
    expect(called('POST /api/v1/students')[0]!.body).toEqual({
      rollNumber: '21EE009',
      fullName: 'Kiran Rao',
      email: null,
      phone: null,
      academicUnitId: 'u2',
      invite: false,
      details: {
        gender: 'Female',
        dateOfBirth: '2006-05-01',
        board: 'CBSE',
        yearOfPassing: 2024,
        previousResult: 91.5,
        guardianName: 'Suresh Rao',
        guardianMobile: '98480 12345',
        updatesVia: ['WhatsApp'],
      },
    });
    expect(await screen.findByTestId('students-add-btn')).toBeInTheDocument();
  });

  it('imports a CSV: check first (nothing saved), see problems by file line, then import', async () => {
    const dryRuns: boolean[] = [];
    setup('ADMIN', {
      'POST /api/v1/students/import': ({ body }) => {
        dryRuns.push(body.dryRun);
        return {
          data: {
            total: 3,
            created: 2,
            failed: [
              {
                row: 2,
                rollNumber: '21EE002',
                code: 'DUPLICATE',
                message: 'A student with this roll number already exists.',
              },
            ],
            dryRun: body.dryRun,
          },
        };
      },
    });
    renderRoute('/org/students');
    await screen.findByText('Anita Verma');
    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    const dialog = await screen.findByRole('region', { name: 'Import students' });
    const csv =
      'roll_number,full_name,unit_code\n21EE101,One,EEE\n21EE002,Two,EEE\n21EE103,Three,\n';
    await userEvent.upload(
      within(dialog).getByLabelText('CSV file'),
      new File([csv], 'eee.csv', { type: 'text/csv' }),
    );
    expect(await within(dialog).findByText(/found in eee.csv/)).toHaveTextContent(
      '3 students found',
    );

    await userEvent.click(within(dialog).getByRole('button', { name: 'Check file' }));
    expect(await within(dialog).findByText(/ready to import/)).toHaveTextContent(
      '2 of 3 row(s) are ready',
    );
    // data row 2 is line 3 of the file
    const problem = within(dialog).getByRole('row', { name: /21EE002/ });
    expect(problem).toHaveTextContent('3');
    expect(problem).toHaveTextContent('already exists');
    expect(called('POST /api/v1/students/import')[0]!.body.rows).toEqual([
      { rollNumber: '21EE101', fullName: 'One', unitCode: 'EEE' },
      { rollNumber: '21EE002', fullName: 'Two', unitCode: 'EEE' },
      { rollNumber: '21EE103', fullName: 'Three' },
    ]);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Import 2 students' }));
    await waitFor(() => expect(dryRuns).toEqual([true, false]));
    expect(await screen.findByText('2 students imported')).toBeInTheDocument();
  });

  it('a file without the required columns cannot be checked', async () => {
    setup('OWNER');
    renderRoute('/org/students');
    await screen.findByText('Anita Verma');
    await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    const dialog = await screen.findByRole('region', { name: 'Import students' });
    await userEvent.upload(
      within(dialog).getByLabelText('CSV file'),
      new File(['name\nAsha\n'], 'bad.csv', { type: 'text/csv' }),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Missing column(s): roll_number',
    );
    expect(within(dialog).getByRole('button', { name: 'Check file' })).toBeDisabled();
  });

  it('students cannot open it; teachers see no add/import buttons', async () => {
    setup('STUDENT');
    const { unmount } = renderRoute('/org/students');
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    unmount();
    setup('TEACHER');
    renderRoute('/org/students');
    expect(await screen.findByText('Anita Verma')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add student' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import CSV' })).not.toBeInTheDocument();
  });
});
