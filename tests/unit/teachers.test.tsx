// Phase 9: Teachers page (add/invite, edit, remove, scope) with the real routes and providers.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import { PERMS, meAs, mockApi, renderRoute, type Handler } from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const T = (id: string, fullName: string, over: Record<string, unknown> = {}) => ({
  id,
  employeeCode: `EMP-${id}`,
  fullName,
  email: `${fullName.split(' ')[0]!.toLowerCase()}@college.test`,
  phone: null,
  status: 'active',
  userId: `user-${id}`,
  accountStatus: 'active',
  scopeCount: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const teachers = [
  T('t1', 'Ravi Kumar'),
  T('t2', 'Meera Nair', { scopeCount: 0 }),
  T('t3', 'Anil Das', { userId: null, accountStatus: null, scopeCount: 0 }),
  T('t4', 'Lata Rao', { status: 'inactive', accountStatus: 'suspended' }),
];
const page = <X,>(items: X[]) => ({
  items,
  pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
});
const subj = (id: string, name: string) => ({ id, code: id.toUpperCase(), name, status: 'active' });

let calls: ReturnType<typeof mockApi>;
const called = (key: string) => calls.filter((c) => c.key === key);
const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

function setup(role: keyof typeof PERMS, extra: Record<string, Handler> = {}) {
  resetFakeSupabase(fakeSession());
  calls = mockApi({
    'GET /api/v1/me': () => ({ data: meAs(role) }),
    'GET /api/v1/teachers': () => ({ data: page(teachers) }),
    'GET /api/v1/teachers/t1': () => ({
      data: {
        ...teachers[0],
        scopes: [
          {
            scopeType: 'subject',
            scopeId: 's1',
            name: 'Electrical Machines',
            code: 'S1',
            active: true,
          },
          {
            scopeType: 'subject',
            scopeId: 'gone',
            name: 'Old Subject',
            code: 'OLD',
            active: false,
          },
        ],
      },
    }),
    'GET /api/v1/subjects': () => ({
      data: page([subj('s1', 'Electrical Machines'), subj('s2', 'Power Systems')]),
    }),
    'GET /api/v1/courses': () => ({ data: page([subj('c1', 'B.Tech')]) }),
    'GET /api/v1/academic-units/tree': () => ({
      data: {
        levels: [],
        units: [
          { id: 'u1', code: 'BT', name: 'B.Tech', status: 'active', levelId: 'l1', parentId: null },
        ],
        truncated: false,
      },
    }),
    ...extra,
  });
}
afterEach(() => vi.unstubAllGlobals());

const actions = async (name: string) => {
  await userEvent.click(within(rowFor(name)).getByRole('button', { name: `Actions for ${name}` }));
  return within(screen.getByRole('menu'))
    .getAllByRole('menuitem')
    .map((i) => i.textContent);
};

describe('Teachers page', () => {
  it('lists teachers with their login state and scope', async () => {
    setup('OWNER');
    renderRoute('/org/teachers');
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(within(rowFor('Ravi Kumar')).getByText('Can sign in')).toBeInTheDocument();
    expect(within(rowFor('Ravi Kumar')).getByText('2 items')).toBeInTheDocument();
    expect(within(rowFor('Meera Nair')).getByText('Nothing assigned')).toBeInTheDocument();
    expect(within(rowFor('Anil Das')).getByText('Not invited')).toBeInTheDocument();
    expect(within(rowFor('Lata Rao')).getByText('Locked')).toBeInTheDocument();
  });

  it('offers only the actions that fit each teacher', async () => {
    setup('ADMIN');
    renderRoute('/org/teachers');
    await screen.findByText('Ravi Kumar');
    expect(await actions('Ravi Kumar')).toEqual(['Edit', 'Assign scope', 'Remove']);
    await userEvent.keyboard('{Escape}');
    expect(await actions('Anil Das')).toEqual(['Edit', 'Send invitation', 'Remove']);
  });

  it('adds a teacher and sends the invitation', async () => {
    setup('OWNER', {
      'POST /api/v1/teachers': ({ body }) => ({ status: 201, data: T('t9', body.fullName) }),
    });
    renderRoute('/org/teachers');
    await screen.findByText('Ravi Kumar');
    await userEvent.click(screen.getByRole('button', { name: 'Add teacher' }));
    const dialog = await screen.findByRole('region', { name: 'Add a teacher' });
    expect(within(dialog).getByLabelText(/Send an invitation to sign in/)).toBeChecked();
    await userEvent.type(within(dialog).getByLabelText(/Full name/), 'Priya Shah');
    await userEvent.type(within(dialog).getByLabelText(/Employee code/), 'EMP-77');
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'priya@college.test');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add teacher' }));
    await waitFor(() => expect(called('POST /api/v1/teachers')).toHaveLength(1));
    expect(called('POST /api/v1/teachers')[0]!.body).toEqual({
      employeeCode: 'EMP-77',
      fullName: 'Priya Shah',
      email: 'priya@college.test',
      phone: null,
      invite: true,
    });
    expect(
      await screen.findByText('An invitation was sent to priya@college.test.'),
    ).toBeInTheDocument();
  });

  it('an invitation needs an e-mail address (checked before sending)', async () => {
    setup('OWNER');
    renderRoute('/org/teachers');
    await screen.findByText('Ravi Kumar');
    await userEvent.click(screen.getByRole('button', { name: 'Add teacher' }));
    const dialog = await screen.findByRole('region', { name: 'Add a teacher' });
    await userEvent.type(within(dialog).getByLabelText(/Full name/), 'No Mail');
    await userEvent.type(within(dialog).getByLabelText(/Employee code/), 'EMP-1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add teacher' }));
    expect(await within(dialog).findByText(/needed to send the invitation/)).toBeInTheDocument();
    expect(called('POST /api/v1/teachers')).toHaveLength(0);
  });

  it('the sign-in e-mail of a linked teacher is shown but not sent when editing', async () => {
    setup('OWNER', { 'PATCH /api/v1/teachers/t1': () => ({ data: teachers[0] }) });
    renderRoute('/org/teachers');
    await screen.findByText('Ravi Kumar');
    await actions('Ravi Kumar');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('region', { name: 'Edit Ravi Kumar' });
    expect(within(dialog).getByLabelText(/Email/)).toBeDisabled();
    await userEvent.selectOptions(within(dialog).getByLabelText(/Status/), 'inactive');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(called('PATCH /api/v1/teachers/t1')).toHaveLength(1));
    const body = called('PATCH /api/v1/teachers/t1')[0]!.body;
    expect(body).toMatchObject({ status: 'inactive', fullName: 'Ravi Kumar' });
    expect(body).not.toHaveProperty('email');
  });

  it('assigns a scope: current items pre-checked, deleted ones dropped, the full new set is sent', async () => {
    setup('OWNER', {
      'PUT /api/v1/teachers/t1/scopes': ({ body }) => ({
        data: { teacherId: 't1', scopes: body.scopes },
      }),
    });
    renderRoute('/org/teachers');
    await screen.findByText('Ravi Kumar');
    await actions('Ravi Kumar');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Assign scope' }));
    const drawer = await screen.findByRole('region', { name: 'Scope of Ravi Kumar' });
    expect(await within(drawer).findByLabelText('Electrical Machines (S1)')).toBeChecked();
    expect(within(drawer).getByLabelText('Power Systems (S2)')).not.toBeChecked();
    expect(within(drawer).getByRole('note')).toHaveTextContent('1 assigned item(s) were deleted');
    await userEvent.click(within(drawer).getByLabelText('B.Tech (C1)'));
    await userEvent.click(within(drawer).getByRole('button', { name: 'Save scope' }));
    await waitFor(() => expect(called('PUT /api/v1/teachers/t1/scopes')).toHaveLength(1));
    expect(called('PUT /api/v1/teachers/t1/scopes')[0]!.body.scopes).toEqual([
      { scopeType: 'subject', scopeId: 's1' },
      { scopeType: 'course', scopeId: 'c1' },
    ]);
    expect(await screen.findByText('Scope saved')).toBeInTheDocument();
  });

  it('removes a teacher after confirmation', async () => {
    setup('OWNER', { 'DELETE /api/v1/teachers/t2': () => ({ data: { deleted: true } }) });
    renderRoute('/org/teachers');
    await screen.findByText('Meera Nair');
    await actions('Meera Nair');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
    const dialog = await screen.findByRole('group', { name: 'Remove this teacher?' });
    expect(dialog).toHaveTextContent('loses access to your organization');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove teacher' }));
    await waitFor(() => expect(called('DELETE /api/v1/teachers/t2')).toHaveLength(1));
    expect(await screen.findByText('Teacher removed')).toBeInTheDocument();
  });

  it('teachers and students cannot open it', async () => {
    for (const role of ['TEACHER', 'STUDENT'] as const) {
      setup(role);
      const { unmount } = renderRoute('/org/teachers');
      expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
      expect(called('GET /api/v1/teachers')).toHaveLength(0);
      unmount();
    }
  });
});
