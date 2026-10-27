# exam-platform-frontend

React + TypeScript + Vite + Tailwind client for the multi-tenant Online Examination & Assessment platform.

**Status: PHASE 2 – theme and shared UI (CODE COMPLETE, TEST READY).**
No feature screens yet; those arrive phase by phase.

## Run

```bash
npm install
cp .env.example .env.local        # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL (public values only)
npm run dev                       # http://localhost:5173
```

Open **http://localhost:5173/dev/ui** (development only) to see every shared component in the theme.

## Check

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## What Phase 2 contains

- `src/styles/theme.css` + `tailwind.config.ts`: design tokens (`--color-primary` ...); Tailwind classes like `bg-primary`, `text-muted`, `border-border` read them.
- `src/components/ui`: Button, Badge/StatusBadge, Card/StatCard/ChartCard, Tabs, Dropdown, Avatar, Icon.
- `src/components/forms/Form.tsx`: Field, Input, Select, Textarea, Checkbox, Radio (React Hook Form friendly, labelled, aria wired).
- `src/components/modals/Dialog.tsx`: Modal, Drawer, ConfirmDialog (focus trap, Escape, focus return).
- `src/components/feedback`: Toast (+ `useToast`), Empty/Loading/Error states.
- `src/components/tables`: DataTable (sortable, states), Pagination, SearchInput (debounced), FilterBar.
- `src/components/charts`: BarChart, DonutChart (SVG, text alternatives).
- `src/components/layout`: AppShell (236px sidebar, collapsible, mobile drawer), Sidebar, Topbar, PageHeader, Breadcrumb.
- `src/utils/navigation.ts`: menu definitions with the permission each item needs (`filterNavigation` hides items; routes and the API still enforce access).

## Rules

- Only public values in `VITE_*` variables. Secrets stay in the backend repo.
- Authorization in React is for UX only; the backend and database RLS enforce access.
