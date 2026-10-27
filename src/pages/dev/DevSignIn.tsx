// PURPOSE: DEVELOPMENT-ONLY sign-in page (/dev/signin) so Phase 4 can be tried before the real login screens (Phase 5).
// WHY: Uses the real Supabase session, so the API client sends a real token. It is not part of production builds.
// DEPENDS ON: lib/supabaseClient.ts, shared UI.

import { zodResolver } from '@hookform/resolvers/zod';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '@/components/feedback/Toast';
import { Input } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabaseClient';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type Values = z.infer<typeof schema>;

export default function DevSignIn() {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(v);
    setBusy(false);
    if (error) toast({ title: 'Sign-in failed', description: error.message, variant: 'error' });
  });

  return (
    <div className="mx-auto max-w-md p-6">
      <PageHeader
        title="Dev sign-in"
        description="Development only. The real login screens arrive in Phase 5."
      />
      <Card>
        {session ? (
          <div className="grid gap-4">
            <p className="text-sm text-text">
              Signed in as <strong>{session.user.email}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/org/profile"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
              >
                Open organization profile
              </Link>
              <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <div>
              <Button type="submit" loading={busy}>
                Sign in
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
