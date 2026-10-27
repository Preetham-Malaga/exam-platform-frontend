// Test-only: provides a ready-made AuthContext value so context consumers can be tested without Supabase or fetch.
import type { ReactNode } from 'react';
import { AuthContextTestProvider } from '@/contexts/AuthContext';

export function AuthContextForTests({
  me,
  children,
}: {
  me: Record<string, unknown> | null;
  children: ReactNode;
}) {
  return (
    <AuthContextTestProvider
      value={
        me
          ? {
              me: {
                user: { id: 'u1', email: 'x@y.z', fullName: 'X' },
                organization: null,
                scopes: [],
                studentId: null,
                ...me,
              } as never,
            }
          : { me: null }
      }
    >
      {children}
    </AuthContextTestProvider>
  );
}
