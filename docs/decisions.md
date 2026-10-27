# Decisions

- Tailwind v3 is used because the project requires `tailwind.config.ts` with CSS-variable theme tokens.
- `@/` aliases `src/` (tsconfig + vite).
- Only public `VITE_*` variables; `lib/env.ts` rejects secret-looking names at startup.
- Theme tokens come from the POC `index.html` and live in `src/styles/theme.css`.
- Database changes belong to the backend repo (`supabase/migrations`).
