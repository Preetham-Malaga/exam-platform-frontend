import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: { sourcemap: true },
  // Fail loudly if 5173 is taken instead of moving to 5174: the API only trusts the configured frontend origin.
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['tests/setup.ts'],
    // Tests mount the real router with lazy pages; the first render of a page compiles it, which is slow under load.
    testTimeout: 20_000,
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_API_URL: 'http://localhost:4000',
    },
  },
});
