import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';

describe('route table', () => {
  it('renders the not-found page for an unknown path (lazy route)', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/does-not-exist'] });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
