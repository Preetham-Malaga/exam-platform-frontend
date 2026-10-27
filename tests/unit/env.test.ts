import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

const valid = {
  VITE_SUPABASE_URL: 'https://abc.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon',
  VITE_API_URL: 'http://localhost:4000',
};

describe('parseEnv', () => {
  it('accepts a valid public configuration', () => {
    expect(parseEnv(valid).VITE_API_URL).toBe('http://localhost:4000');
  });

  it('rejects a missing or malformed variable', () => {
    expect(() => parseEnv({ ...valid, VITE_API_URL: 'nope' })).toThrow(/VITE_API_URL/);
    expect(() => parseEnv({ ...valid, VITE_SUPABASE_ANON_KEY: '' })).toThrow();
  });

  it('refuses secret-looking VITE_ variables without printing their values', () => {
    try {
      parseEnv({ ...valid, VITE_SUPABASE_SERVICE_ROLE_KEY: 'super-secret-value' });
      expect.unreachable();
    } catch (err) {
      expect(String(err)).toContain('VITE_SUPABASE_SERVICE_ROLE_KEY');
      expect(String(err)).not.toContain('super-secret-value');
    }
  });
});
