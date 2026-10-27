import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/public/LandingPage';
import NotFoundPage from '@/pages/public/NotFoundPage';
import { AuthContextForTests } from '../helpers/authContext';

// LandingPage reads useAuth() (signed-in users are redirected), so it renders as a signed-out visitor here.
function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthContextForTests me={null}>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthContextForTests>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('LandingPage', () => {
  it('shows the backend health once loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                status: 'ok',
                api: 'up',
                database: 'up',
                redis: 'up',
                version: '0.1.0',
                environment: 'test',
              },
              error: null,
              requestId: 'r',
            }),
          ),
        ),
      ),
    );
    renderWithProviders(<LandingPage />);
    expect(await screen.findByText('0.1.0')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exam Platform' })).toBeInTheDocument();
  });

  it('shows a friendly error when the API is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('down'))),
    );
    renderWithProviders(<LandingPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });
});

describe('NotFoundPage', () => {
  it('links back home', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/');
  });
});
