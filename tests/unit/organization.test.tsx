import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/feedback/Toast';
import { brandingFormSchema, organizationFormSchema } from '@/features/organizations/schemas';
import { createApiClient } from '@/lib/api';
import OrganizationProfilePage from '@/pages/organization/OrganizationProfilePage';

// The API client reads the access token from the Supabase session: fake it.
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
  },
}));

const org = {
  id: '11111111-1111-4111-8111-111111111111',
  orgCode: 'ORG-000042',
  name: 'Demo College',
  institutionType: 'engineering',
  status: 'active',
  contactEmail: 'office@demo.test',
  contactPhone: null,
  address: null,
  branding: { primaryColor: '#112233' },
  timezone: 'Asia/Kolkata',
  createdAt: '2026-01-01T00:00:00Z',
};

type Call = { method: string; url: string; body: unknown; auth: string | null };
let calls: Call[] = [];
let respond: (c: Call) => {
  status: number;
  data?: unknown;
  error?: { code: string; message: string };
};

const envelope = (r: ReturnType<typeof respond>) =>
  new Response(
    JSON.stringify(
      r.status < 400
        ? { success: true, data: r.data, error: null, requestId: 'r1' }
        : { success: false, data: null, error: r.error, requestId: 'r1' },
    ),
    { status: r.status },
  );

beforeEach(() => {
  calls = [];
  respond = (c) =>
    c.method === 'GET' ? { status: 200, data: org } : { status: 200, data: { updated: true } };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const call: Call = {
        method: init.method ?? 'GET',
        url,
        body: init.body ? JSON.parse(init.body as string) : undefined,
        auth: (init.headers as Record<string, string>)?.Authorization ?? null,
      };
      calls.push(call);
      return envelope(respond(call));
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <OrganizationProfilePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('OrganizationProfilePage', () => {
  it('loads the organization with the signed-in user token and shows its facts', async () => {
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument(); // loading state first
    expect(await screen.findByText('ORG-000042')).toBeInTheDocument();
    expect(screen.getByText('Engineering college')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization name/)).toHaveValue('Demo College');
    expect(screen.getByLabelText('Contact email')).toHaveValue('office@demo.test');
    expect(calls[0]).toMatchObject({ method: 'GET', auth: 'Bearer test-token' });
    expect(calls[0]!.url).toContain('/api/v1/organizations/current');
  });

  it('Save is disabled until something changes, then sends only valid, normalised data', async () => {
    renderPage();
    const name = await screen.findByLabelText(/Organization name/);
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();
    await userEvent.clear(name);
    await userEvent.type(name, 'Renamed College');
    expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.body).toEqual({
      name: 'Renamed College',
      contactEmail: 'office@demo.test',
      contactPhone: null,
      address: null,
    }); // blanks become null
    expect(patch.url).toMatch(/\/organizations\/current$/);
    expect(await screen.findByText('Organization updated')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled(),
    ); // new baseline after saving
  });

  it('shows validation messages and does NOT call the API when input is invalid', async () => {
    renderPage();
    const name = await screen.findByLabelText(/Organization name/);
    await userEvent.clear(name);
    await userEvent.type(name, 'x');
    await userEvent.clear(screen.getByLabelText('Contact email'));
    await userEvent.type(screen.getByLabelText('Contact email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
  });

  it('shows the server message when the backend refuses (e.g. not the owner)', async () => {
    respond = (c) =>
      c.method === 'GET'
        ? { status: 200, data: org }
        : {
            status: 403,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to perform this action.',
            },
          };
    renderPage();
    await userEvent.type(await screen.findByLabelText('Contact phone'), '12345');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Could not save')).toBeInTheDocument();
    expect(
      screen.getByText('You do not have permission to perform this action.'),
    ).toBeInTheDocument();
  });

  it('shows an error state with Try again when loading fails, and recovers', async () => {
    respond = () => ({
      status: 401,
      error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' },
    });
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Please sign in to continue.');
    respond = () => ({ status: 200, data: org });
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('ORG-000042')).toBeInTheDocument();
  });

  it('shows a friendly message (not raw errors) when the server cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });

  it('branding tab validates the colour and saves to the settings endpoint', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('tab', { name: 'Branding' }));
    const colour = screen.getByLabelText('Primary colour');
    expect(colour).toHaveValue('#112233');
    await userEvent.clear(colour);
    await userEvent.type(colour, 'red');
    await userEvent.click(screen.getByRole('button', { name: 'Save branding' }));
    expect(await screen.findByText('Use a hex colour such as #363B6C')).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
    await userEvent.clear(colour);
    await userEvent.type(colour, '#AABBCC');
    await userEvent.type(screen.getByLabelText('Tagline'), 'Learn well');
    await userEvent.click(screen.getByRole('button', { name: 'Save branding' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.url).toMatch(/\/organizations\/current\/settings$/);
    expect(patch.body).toEqual({ branding: { primaryColor: '#AABBCC', tagline: 'Learn well' } });
  });

  it('never sends fields the backend forbids (status, code, ids)', async () => {
    renderPage();
    await userEvent.type(await screen.findByLabelText('Contact phone'), '999');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    expect(Object.keys(calls.find((c) => c.method === 'PATCH')!.body as object).sort()).toEqual([
      'address',
      'contactEmail',
      'contactPhone',
      'name',
    ]);
  });
});

describe('form schemas', () => {
  it('organization form: trims, bounds and allows blank optional fields', () => {
    expect(
      organizationFormSchema.safeParse({
        name: '  Demo  ',
        contactEmail: '',
        contactPhone: '',
        address: '',
      }).success,
    ).toBe(true);
    expect(
      organizationFormSchema.safeParse({
        name: 'D',
        contactEmail: '',
        contactPhone: '',
        address: '',
      }).success,
    ).toBe(false);
    expect(
      organizationFormSchema.safeParse({
        name: 'Demo',
        contactEmail: 'bad',
        contactPhone: '',
        address: '',
      }).success,
    ).toBe(false);
    expect(
      organizationFormSchema.safeParse({
        name: 'Demo',
        contactEmail: '',
        contactPhone: '1'.repeat(31),
        address: '',
      }).success,
    ).toBe(false);
  });
  it('branding form: only 6-digit hex colours', () => {
    for (const ok of ['#363B6C', '#abcdef'])
      expect(brandingFormSchema.safeParse({ primaryColor: ok, tagline: '' }).success).toBe(true);
    for (const bad of ['363B6C', '#fff', 'red', '#12345G', ''])
      expect(brandingFormSchema.safeParse({ primaryColor: bad, tagline: '' }).success).toBe(false);
  });
});

describe('api client token handling', () => {
  it('omits Authorization when signed out and adds it when a token exists', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: {}, error: null, requestId: 'r' })),
    );
    const signedOut = createApiClient({
      baseUrl: 'http://api',
      getAccessToken: async () => null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await signedOut.get('/x');
    expect(
      (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].headers,
    ).not.toHaveProperty('Authorization');
    const signedIn = createApiClient({
      baseUrl: 'http://api',
      getAccessToken: async () => 'abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await signedIn.get('/x');
    expect(
      (
        (fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].headers as Record<
          string,
          string
        >
      ).Authorization,
    ).toBe('Bearer abc');
  });
});
