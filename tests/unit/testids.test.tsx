// The data-testid contract of the shared components (docs/locators.md). QA locators depend on these exact ids.
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { Input, PasswordInput, Select, Textarea } from '@/components/forms/Form';
import { PageRoot } from '@/components/layout/PageRoot';
import { SidebarNav } from '@/components/layout/Sidebar';
import { InlineConfirm, InlinePanel } from '@/components/inline/Inline';
import { DataTable, Pagination } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Dropdown } from '@/components/ui/Dropdown';
import { Tabs } from '@/components/ui/Tabs';
import { orgNavigation, studentNavigation, teacherNavigation } from '@/utils/navigation';
import { navTestId, slug, testIdBase } from '@/utils/testid';
import { NavLinks } from '../locators/shell';
import { tid } from '../locators/tid';

describe('testid helpers', () => {
  it('derive the field base, slugs and nav link ids', () => {
    expect(testIdBase('login-email-input')).toBe('login-email');
    expect(testIdBase('signup-institution-type-select')).toBe('signup-institution-type');
    expect(testIdBase('notes-textarea')).toBe('notes');
    expect(testIdBase(undefined)).toBeUndefined();
    expect(slug('Roles & Permissions')).toBe('roles-permissions');
    expect(navTestId('/org/dashboard')).toBe('nav-dashboard-link');
    expect(navTestId('/org/exams/published')).toBe('nav-exams-published-link');
    expect(navTestId('/org/settings/permissions')).toBe('nav-settings-permissions-link');
  });
  it('give every sidebar link a unique id', () => {
    const ids = orgNavigation.flatMap((s) => s.items.map((i) => navTestId(i.to)));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('keep the QA locator constants in step with the real sidebar (tests/locators/shell.ts)', () => {
    const areas = [orgNavigation, teacherNavigation, studentNavigation];
    const real = new Set(
      areas.flatMap((a) => a.flatMap((s) => s.items.map((i) => tid(navTestId(i.to))))),
    );
    for (const [name, selector] of Object.entries(NavLinks))
      expect(real.has(selector), `NavLinks.${name} = ${selector}`).toBe(true);
  });
});

describe('form controls', () => {
  it('put the id on the control and derive -error / -hint ids wired by aria-describedby', () => {
    render(
      <>
        <Input label="Email" name="email" data-testid="login-email-input" error="Required" />
        <Textarea label="Notes" name="notes" data-testid="exam-notes-textarea" hint="Optional" />
      </>,
    );
    const input = screen.getByTestId('login-email-input');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('name', 'email');
    const error = screen.getByTestId('login-email-error');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(screen.getByTestId('exam-notes-hint')).toHaveTextContent('Optional');
  });
  it('password toggle and select options get ids; options are told apart by data-value', () => {
    render(
      <>
        <PasswordInput label="Password" data-testid="login-password-input" />
        <Select
          label="Type"
          data-testid="signup-institution-type-select"
          placeholder="Pick"
          options={[
            { value: 'school', label: 'School' },
            { value: 'mba', label: 'MBA' },
          ]}
        />
      </>,
    );
    fireEvent.click(screen.getByTestId('login-password-toggle-btn'));
    expect(screen.getByTestId('login-password-input')).toHaveAttribute('type', 'text');
    const options = screen.getAllByTestId('signup-institution-type-option');
    expect(options.map((o) => o.getAttribute('data-value'))).toEqual(['', 'school', 'mba']);
  });
});

describe('table, pagination, search', () => {
  const rows = [
    { id: 'a1', code: 'MID1', name: 'Midterm' },
    { id: 'b2', code: 'FIN1', name: 'Final' },
  ];
  it('rows share one id and carry data-entity-id / data-entity-code; cells are per column', () => {
    render(
      <DataTable
        caption="Exams"
        testId="exam"
        rows={rows}
        rowKey={(r) => r.id}
        rowCode={(r) => r.code}
        sort={{ key: 'name', order: 'asc' }}
        onSortChange={() => undefined}
        columns={[{ key: 'name', header: 'Name', sortable: true, cell: (r) => r.name }]}
      />,
    );
    expect(screen.getByTestId('exam-table')).toBeInTheDocument();
    const found = screen.getAllByTestId('exam-row');
    expect(found.map((r) => r.getAttribute('data-entity-id'))).toEqual(['a1', 'b2']);
    expect(found[1]).toHaveAttribute('data-entity-code', 'FIN1');
    expect(screen.getAllByTestId('exam-row-name-cell')[0]).toHaveTextContent('Midterm');
    expect(screen.getByTestId('exam-sort-name-btn')).toBeInTheDocument();
  });
  it('loading, empty and error states are prefixed with the table id', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <DataTable caption="x" testId="exam" rows={[]} rowKey={() => ''} columns={[]} loading />,
    );
    expect(screen.getByTestId('exam-loader')).toHaveAttribute('data-loading', 'true');
    rerender(<DataTable caption="x" testId="exam" rows={[]} rowKey={() => ''} columns={[]} />);
    expect(screen.getByTestId('exam-empty')).toBeInTheDocument();
    rerender(
      <DataTable
        caption="x"
        testId="exam"
        rows={[]}
        rowKey={() => ''}
        columns={[]}
        error="down"
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByTestId('exam-error-retry-btn'));
    expect(onRetry).toHaveBeenCalled();
  });
  it('pagination, search box and clear-filters button have ids', () => {
    const onPage = vi.fn();
    render(
      <>
        <FilterBar onClear={() => undefined} canClear>
          <SearchInput value="" onSearch={() => undefined} testId="exams-search-input" />
        </FilterBar>
        <Pagination page={1} totalPages={2} total={15} pageSize={10} onPageChange={onPage} />
      </>,
    );
    expect(screen.getByTestId('exams-search-input')).toHaveAttribute('name', 'search');
    expect(screen.getByTestId('filter-clear-btn')).toBeInTheDocument();
    expect(screen.getByTestId('pagination')).toHaveAttribute('data-page', '1');
    expect(screen.getByTestId('pagination-prev-btn')).toBeDisabled();
    fireEvent.click(screen.getByTestId('pagination-next-btn'));
    expect(onPage).toHaveBeenCalledWith(2);
  });
});

describe('tabs, menus, dialogs, states, page root, nav', () => {
  it('tabs expose data-selected; menu items get ids from the menu prefix', () => {
    const onSelect = vi.fn();
    render(
      <>
        <Tabs
          label="Exams"
          testId="exams"
          value="draft"
          onChange={() => undefined}
          tabs={[
            { id: 'draft', label: 'Draft', content: 'd' },
            { id: 'published', label: 'Published' },
          ]}
        />
        <Dropdown
          label="Row actions"
          testId="exam-row-actions"
          trigger="⋯"
          items={[{ label: 'Delete exam', onSelect }]}
        />
      </>,
    );
    expect(screen.getByTestId('exams-tab-draft')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('exams-tab-published')).toHaveAttribute('data-selected', 'false');
    expect(screen.getByTestId('exams-tab-panel')).toHaveAttribute('data-tab', 'draft');
    fireEvent.click(screen.getByTestId('exam-row-actions-menu-btn'));
    expect(screen.getByTestId('exam-row-actions-menu-btn')).toHaveAttribute(
      'data-expanded',
      'true',
    );
    fireEvent.click(screen.getByTestId('exam-row-actions-delete-exam-menu-item'));
    expect(onSelect).toHaveBeenCalled();
  });
  it('inline confirm and inline panel ids follow their prefix', () => {
    const onConfirm = vi.fn();
    render(
      <>
        <InlinePanel open onClose={() => undefined} title="New course" testId="course-form">
          x
        </InlinePanel>
        <InlineConfirm
          open
          testId="exam-delete"
          title="Delete?"
          message="Sure?"
          onConfirm={onConfirm}
          onCancel={() => undefined}
        />
      </>,
    );
    expect(screen.getByTestId('course-form')).toBeInTheDocument();
    expect(screen.getByTestId('course-form-close-btn')).toBeInTheDocument();
    expect(screen.getByTestId('exam-delete-confirm')).toHaveAttribute('data-state', 'danger');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('exam-delete-cancel-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('exam-delete-confirm-btn'));
    expect(onConfirm).toHaveBeenCalled();
  });
  it('states take page ids and default to generic ones', () => {
    render(
      <>
        <LoadingState testId="exams-loader" />
        <EmptyState title="None" />
        <ErrorState message="x" />
      </>,
    );
    expect(screen.getByTestId('exams-loader')).toBeInTheDocument();
    expect(screen.getByTestId('state-empty')).toBeInTheDocument();
    expect(screen.getByTestId('state-error')).toBeInTheDocument();
  });
  it('page root reports readiness', () => {
    const { rerender } = render(
      <PageRoot testId="page-exams" ready={false}>
        x
      </PageRoot>,
    );
    expect(screen.getByTestId('page-exams')).toHaveAttribute('data-ready', 'false');
    rerender(<PageRoot testId="page-exams">x</PageRoot>);
    expect(screen.getByTestId('page-exams')).toHaveAttribute('data-ready', 'true');
  });
  it('sidebar links are real links with route-derived ids', () => {
    render(
      <MemoryRouter>
        <SidebarNav sections={orgNavigation} />
      </MemoryRouter>,
    );
    const link = screen.getByTestId('nav-exams-published-link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/org/exams/published');
  });
});
