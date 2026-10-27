// PURPOSE: Validates the public VITE_* variables and refuses secret-looking names.
// WHY: Anything starting with VITE_ is visible to every visitor; secrets must never reach React.
// DEPENDS ON: import.meta.env. Used by lib/supabaseClient.ts and lib/api.ts.

import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().trim().min(1),
  VITE_API_URL: z.string().url(),
});

export type AppEnv = z.infer<typeof envSchema>;

const FORBIDDEN_NAME = /SERVICE_ROLE|SECRET|PASSWORD|PRIVATE|DATABASE_URL|REDIS/i;

/** Throws if a public variable name looks like a secret. Values are never printed. */
export function assertNoSecretsInPublicEnv(raw: Record<string, unknown>): void {
  const offenders = Object.keys(raw).filter(
    (key) => key.startsWith('VITE_') && FORBIDDEN_NAME.test(key),
  );
  if (offenders.length > 0) {
    throw new Error(
      `Secret-looking variable(s) exposed to the browser: ${offenders.join(', ')}. ` +
        'Remove the VITE_ prefix and keep the value on the backend.',
    );
  }
}

export function parseEnv(raw: Record<string, unknown>): AppEnv {
  assertNoSecretsInPublicEnv(raw);
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid frontend environment: ${problems}`);
  }
  return result.data;
}

export const env: AppEnv = parseEnv(import.meta.env);
