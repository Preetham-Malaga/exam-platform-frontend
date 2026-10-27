// PURPOSE: Wraps the app in global providers (TanStack Query now; Auth/Organization/Permission later).
// WHY: Providers must be composed in one place, in a fixed order.
// DEPENDS ON: lib/queryClient.ts. Used by app/App.tsx.

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/feedback/Toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { createQueryClient } from '@/lib/queryClient';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <PermissionProvider>
            <OrganizationProvider>{children}</OrganizationProvider>
          </PermissionProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
