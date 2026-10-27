// PURPOSE: Configures the shared TanStack Query client.
// WHY: One place sets caching and retry rules for every data hook.
// DEPENDS ON: @tanstack/react-query, lib/api.ts (ApiClientError). Used by app/providers.tsx.

import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './api';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Do not retry client mistakes (401/403/404...); retry network or server faults twice.
          if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}
