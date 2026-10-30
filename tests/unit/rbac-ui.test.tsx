import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSession, resetFakeSupabase } from '../helpers/fakeSupabase';
import {
  PERMS,
  meAs,
  meFor,
  mockApi,
  renderRoute,
  rolesPayload,
  type Handler,
} from '../helpers/app';

vi.mock('@/lib/supabaseClient', async () => ({
  supabase: (await import('../helpers/fakeSupabase')).fakeSupabase,
}));

const U = (userId: string, fullName: string, role: string, status = 'active') => ({
  userId,
  email: `${fullName.split(' ')[0]!.toLowerCase()}@college.test`,
  fullName,
  status,
  joinedAt: '2026-02-01T00:00:00Z',
  roles: [role],
});
const users = [
  U('u1', 'Asha Verma', 'ORGANIZATION_OWNER'),
  U('u2', 'Ravi Kumar', 'ORGANIZATION_ADMIN'),
  U('u3', 'Meera Nair', 'TEACHER'),
  U('u4', 'Kiran Rao', 'STUDENT', 'suspended'),
];
const org = {
  id: 'o1',
  orgCode: 'ORG-000007',
  name: 'Demo College',
  institutionType: 'engineering',
  status: 'active',
  contactEmail: null,
  contactPhone: null,
  address: null,
  branding: {},
  timezone: 'Asia/Kolkata',
  createdAt: '2026-01-01T00:00:00Z',
};

let api: Record<string, Handler>;
let calls: ReturnType<typeof mockApi>;
const usersCalls = () => calls.filter((c) => c.key === 'GET /api/v1/users');
const lastUsersQuery = () => usersCalls().at(-1)!.query;

function setup(role: keyof typeof PERMS, me: Record<string, unknown> = {}) {
  resetFakeSupabase(fakeSession());
  api = {
    'GET /api/v1/me': () => ({ data: meAs(role, me) }),
    'GET /api/v1/organizations/current': () => ({ data: org }),
    'GET /api/v1/roles': () => ({ data: rolesPayload() }),
    'GET /api/v1/users': ({ query }) => {
      const list = users.filter(
        (u) =>
          (!query.role || u.roles.includes(query.role)) &&
          (!query.search ||
            `${u.fullName} ${u.email}`.toLowerCase().includes(query.search.toLowerCase())),
      );
      return {
        data: {
          items: list,
          pagination: {
            page: Number(query.page ?? 1),
            pageSize: 10,
            total: list.length === users.length ? 25 : list.length,
            totalPages: list.length === users.length ? 3 : 1,
          },
        },
      };
    },
    'PUT /api/v1/users/u4/role': () => ({ data: { userId: 'u4', role: 'TEACHER' } }),
    'PATCH /api/v1/users/u3/status': () => ({ data: { userId: 'u3', status: 'suspended' } }),
    'POST /api/v1/users/admins': () => ({ status: 201, data: { userId: 'u9' } }),
  };
  calls = mockApi(api);
}
afterEach(() => vi.unstubAllGlobals());

const openNav = async () => {
  const menu = await screen.findByTestId('nav');
  // Groups start closed: open them all so every link the role may use is listed.
  for (const b of within(menu).queryAllByRole('button', { expanded: false }))
    await userEvent.click(b);
  return within(menu);
};
const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

describe('the menu follows the role (UX only)', () => {
  it('owner sees Admins and Roles & Permissions', async () => {
    setup('OWNER');
    renderRoute('/app');
    const nav = await openNav();
    for (const l of [
      'Admins',
      'Roles & Permissions',
      'Organization Profile',
      'Courses',
      'Question Bank',
    ])
      expect(nav.getByRole('link', { name: new RegExp(l) }), l).toBeInTheDocument();
  });
  it('admin sees Admins too', async () => {
    setup('ADMIN');
    renderRoute('/app');
    expect((await openNav()).getByRole('link', { name: /Admins/ })).toBeInTheDocument();
  });
  it('teacher sees only teacher items', async () => {
    setup('TEACHER');
    renderRoute('/app');
    const nav = await openNav();
    expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Dashboard',
      'Courses',
      'Question Bank',
      'Exams',
      'Live Classes',
      'Recorded Classes',
      'Materials',
      'Results',
    ]);
  });
  it('student sees only student items', async () => {
    setup('STUDENT');
    renderRoute('/app');
    const nav = await openNav();
    expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Home',
      'My Exams',
      'My Results',
      'Leaderboard',
      'Live Classes',
      'Recorded Classes',
      'Materials',
    ]);
  });
  it('platform staff get the platform menu, not an organization menu', async () => {
    setup('OWNER', { isPlatformAdmin: true, roles: [], permissions: [], organization: null });
    renderRoute('/app');
    const nav = await openNav();
    expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(['Organizations']);
  });
});

describe('unauthorized pages are refused, not just hidden', () => {
  it.each([
    ['teacher', 'TEACHER', '/org/users'],
    ['teacher', 'TEACHER', '/org/admins'],
    ['teacher', 'TEACHER', '/org/settings/permissions'],
    ['teacher', 'TEACHER', '/org/settings'],
    ['student', 'STUDENT', '/org/profile'],
    ['student', 'STUDENT', '/org/users'],
  ] as const)('%s opening %s is denied', async (_who, role, path) => {
    setup(role);
    renderRoute(path);
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    expect(usersCalls()).toHaveLength(0);
    expect(
      calls.filter((c) =>
        ['GET /api/v1/roles', 'GET /api/v1/organizations/current'].includes(c.key),
      ),
    ).toHaveLength(0); // the protected data is never even requested
    expect(screen.getByRole('link', { name: 'Go to your home page' })).toHaveAttribute(
      'href',
      '/app',
    );
  });
  it('platform staff are not organization owners: organization pages are denied', async () => {
    setup('OWNER', { isPlatformAdmin: true, roles: [], permissions: [], organization: null });
    renderRoute('/org/profile');
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
  });
  it('admin may open the users page but the owner-only invite button is absent', async () => {
    setup('ADMIN');
    renderRoute('/org/users');
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite admin' })).not.toBeInTheDocument();
  });
});

describe('Users page', () => {
  it('lists people with roles and statuses', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    expect(await screen.findByText('Meera Nair')).toBeInTheDocument();
    expect(within(rowFor('Asha Verma')).getByText('Owner')).toBeInTheDocument();
    expect(within(rowFor('Ravi Kumar')).getByText('Admin')).toBeInTheDocument();
    expect(within(rowFor('Kiran Rao')).getByText('Suspended')).toBeInTheDocument();
    expect(within(rowFor('Meera Nair')).getByText('meera@college.test')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument();
  });

  it('shows row actions only where the caller may act (never on yourself or the owner)', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    await screen.findByText('Meera Nair');
    expect(within(rowFor('Asha Verma')).queryByRole('button')).not.toBeInTheDocument(); // yourself
    expect(
      within(rowFor('Ravi Kumar')).getByRole('button', { name: 'Actions for Ravi Kumar' }),
    ).toBeInTheDocument(); // owner may manage admins
    expect(
      within(rowFor('Meera Nair')).getByRole('button', { name: 'Actions for Meera Nair' }),
    ).toBeInTheDocument();
  });

  it('an admin cannot act on the owner or on other admins, and cannot offer the Admin role', async () => {
    setup('ADMIN', { user: { id: 'u2', email: 'ravi@college.test', fullName: 'Ravi Kumar' } });
    renderRoute('/org/users');
    await screen.findByText('Meera Nair');
    expect(within(rowFor('Asha Verma')).queryByRole('button')).not.toBeInTheDocument(); // owner
    expect(within(rowFor('Ravi Kumar')).queryByRole('button')).not.toBeInTheDocument(); // self
    await userEvent.click(
      within(rowFor('Kiran Rao')).getByRole('button', { name: 'Actions for Kiran Rao' }),
    );
    const items = within(screen.getByRole('menu'))
      .getAllByRole('menuitem')
      .map((i) => i.textContent);
    expect(items).toEqual(['Make teacher', 'Reactivate']);
    expect(items).not.toContain('Make admin');
  });

  it('the owner can offer Admin, Teacher and Student', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    await screen.findByText('Meera Nair');
    await userEvent.click(
      within(rowFor('Meera Nair')).getByRole('button', { name: 'Actions for Meera Nair' }),
    );
    expect(
      within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Make admin', 'Make student', 'Suspend']);
  });

  it('changes a role after confirmation and refreshes the list', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    await screen.findByText('Kiran Rao');
    const before = usersCalls().length;
    await userEvent.click(
      within(rowFor('Kiran Rao')).getByRole('button', { name: 'Actions for Kiran Rao' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Make teacher' }));
    const dialog = await screen.findByRole('group', { name: 'Change role?' });
    expect(dialog).toHaveTextContent('Their access changes immediately');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Change role' }));
    await waitFor(() =>
      expect(calls.some((c) => c.key === 'PUT /api/v1/users/u4/role')).toBe(true),
    );
    expect(calls.find((c) => c.key === 'PUT /api/v1/users/u4/role')!.body).toEqual({
      role: 'TEACHER',
    });
    expect(await screen.findByText('Role changed')).toBeInTheDocument();
    await waitFor(() => expect(usersCalls().length).toBeGreaterThan(before));
  });

  it('Cancel does nothing', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    await screen.findByText('Kiran Rao');
    await userEvent.click(
      within(rowFor('Kiran Rao')).getByRole('button', { name: 'Actions for Kiran Rao' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Make teacher' }));
    await userEvent.click(
      within(await screen.findByRole('group', { name: 'Change role?' })).getByRole('button', {
        name: 'Cancel',
      }),
    );
    expect(calls.some((c) => c.key.startsWith('PUT'))).toBe(false);
  });

  it('shows the server message when the role change is refused', async () => {
    setup('OWNER');
    api['PUT /api/v1/users/u4/role'] = () => ({
      status: 403,
      error: { code: 'FORBIDDEN', message: 'Only the organization owner can manage admins.' },
    });
    renderRoute('/org/users');
    await screen.findByText('Kiran Rao');
    await userEvent.click(
      within(rowFor('Kiran Rao')).getByRole('button', { name: 'Actions for Kiran Rao' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Make teacher' }));
    await userEvent.click(
      within(await screen.findByRole('group', { name: 'Change role?' })).getByRole('button', {
        name: 'Change role',
      }),
    );
    expect(await screen.findByText('Could not change the role')).toBeInTheDocument();
    expect(screen.getByText('Only the organization owner can manage admins.')).toBeInTheDocument();
  });

  it('suspends a user after confirmation', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    await screen.findByText('Meera Nair');
    await userEvent.click(
      within(rowFor('Meera Nair')).getByRole('button', { name: 'Actions for Meera Nair' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Suspend' }));
    const dialog = await screen.findByRole('group', { name: 'Suspend this user?' });
    expect(dialog).toHaveTextContent('lose access to this organization right away');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }));
    await waitFor(() =>
      expect(calls.find((c) => c.key === 'PATCH /api/v1/users/u3/status')?.body).toEqual({
        status: 'suspended',
      }),
    );
    expect(await screen.findByText('User suspended')).toBeInTheDocument();
  });

  it('searches (debounced), filters by role, sorts and pages through the server', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    await screen.findByText('Meera Nair');
    expect(lastUsersQuery()).toMatchObject({
      page: '1',
      pageSize: '10',
      sort: 'fullName',
      order: 'asc',
    });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search users' }), 'meera');
    await waitFor(() => expect(lastUsersQuery().search).toBe('meera'));
    expect(usersCalls().filter((c) => c.query.search && c.query.search !== 'meera')).toHaveLength(
      0,
    ); // typing did not fire a request per key
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: 'Search users' })).toHaveValue(''),
    );
    expect(await screen.findByText('Kiran Rao')).toBeInTheDocument(); // the full list is back (served from the cache)
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'TEACHER');
    await waitFor(() => expect(lastUsersQuery().role).toBe('TEACHER'));
    await userEvent.selectOptions(screen.getByLabelText('Role'), '');
    await userEvent.click(screen.getByRole('button', { name: /Joined/ }));
    await waitFor(() => expect(lastUsersQuery()).toMatchObject({ sort: 'joinedAt', order: 'asc' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastUsersQuery().page).toBe('2'));
  });

  it('shows an empty state for no matches and an error state with retry', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    await screen.findByText('Meera Nair');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search users' }), 'zzz-nobody');
    expect(await screen.findByText('No users match your filters')).toBeInTheDocument();
    api['GET /api/v1/users'] = () => ({
      status: 403,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' },
    });
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search users' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search users' }), 'x');
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');
  });

  it('/org/admins is the same table pre-filtered to admins', async () => {
    setup('OWNER');
    renderRoute('/org/admins');
    expect(await screen.findByRole('heading', { name: 'Admins' })).toBeInTheDocument();
    await waitFor(() => expect(usersCalls().length).toBeGreaterThan(0));
    expect(lastUsersQuery().role).toBe('ORGANIZATION_ADMIN');
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.queryByText('Meera Nair')).not.toBeInTheDocument();
  });
});

describe('Invite admin (owner only)', () => {
  it('validates, sends the invitation, confirms and closes', async () => {
    setup('OWNER');
    renderRoute('/org/users');
    await userEvent.click(await screen.findByRole('button', { name: 'Invite admin' }));
    const dialog = await screen.findByRole('region', { name: 'Invite an admin' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invitation' }));
    expect(await within(dialog).findByText('Enter at least 2 characters')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter an email address')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /api/v1/users/admins')).toBe(false);
    await userEvent.type(within(dialog).getByLabelText(/Full name/), 'Priya Shah');
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'priya@college.test');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invitation' }));
    await waitFor(() =>
      expect(calls.find((c) => c.key === 'POST /api/v1/users/admins')?.body).toEqual({
        fullName: 'Priya Shah',
        email: 'priya@college.test',
      }),
    );
    expect(await screen.findByText('Admin added')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Invite an admin' })).not.toBeInTheDocument(),
    );
  });

  it('keeps the dialog open and explains when the server refuses', async () => {
    setup('OWNER');
    api['POST /api/v1/users/admins'] = () => ({
      status: 403,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' },
    });
    renderRoute('/org/users');
    await userEvent.click(await screen.findByRole('button', { name: 'Invite admin' }));
    const dialog = await screen.findByRole('region', { name: 'Invite an admin' });
    await userEvent.type(within(dialog).getByLabelText(/Full name/), 'Priya Shah');
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'priya@college.test');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByText('Could not add the admin')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Invite an admin' })).toBeInTheDocument();
  });
});

describe('Roles & permissions page', () => {
  it('shows the matrix from the server: owner has everything, admin lacks organization.update, student has three', async () => {
    setup('OWNER');
    renderRoute('/org/settings/permissions');
    expect(await screen.findByRole('heading', { name: 'Roles & permissions' })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Permissions held by each role' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Permission', 'Owner', 'Admin', 'Teacher', 'Student']);
    expect(within(table).getByRole('rowheader', { name: 'Users' })).toBeInTheDocument(); // group
    expect(
      within(table).getByRole('img', { name: 'Owner can organization.update' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('img', { name: 'Admin cannot organization.update' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('img', { name: 'Teacher can question.create' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('img', { name: 'Teacher cannot user.update' }),
    ).toBeInTheDocument();
    expect(within(table).getAllByRole('img', { name: /^Student can / })).toHaveLength(3);
  });
  it('/org/settings redirects to it, and an admin may read it', async () => {
    setup('ADMIN');
    renderRoute('/org/settings');
    expect(await screen.findByRole('heading', { name: 'Roles & permissions' })).toBeInTheDocument();
  });
  it('shows an error state when the catalogue cannot load', async () => {
    setup('OWNER');
    api['GET /api/v1/roles'] = () => ({
      status: 403,
      error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' },
    });
    renderRoute('/org/settings/permissions');
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');
  });
});

describe('permissions change when the server says so', () => {
  it('after a refresh with a different role the menu and page access follow the new role', async () => {
    setup('OWNER');
    const view = renderRoute('/app');
    expect(await screen.findByRole('heading', { name: /^Welcome, / })).toBeInTheDocument();
    view.unmount();
    api['GET /api/v1/me'] = () => ({ data: meAs('STUDENT') });
    renderRoute('/org/users');
    expect(await screen.findByText('You do not have access to this page')).toBeInTheDocument();
    void act;
    void meFor;
  });
});
