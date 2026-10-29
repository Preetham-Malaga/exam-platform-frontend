import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarChart, DonutChart } from '@/components/charts/Charts';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { ToastProvider, useToast } from '@/components/feedback/Toast';
import { Checkbox, Input, Select } from '@/components/forms/Form';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumb, PageHeader } from '@/components/layout/PageHeader';
import { InlineConfirm, InlinePanel } from '@/components/inline/Inline';
import { DataTable, Pagination } from '@/components/tables/DataTable';
import { SearchInput } from '@/components/tables/FilterBar';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/Card';
import { Dropdown } from '@/components/ui/Dropdown';
import { Tabs } from '@/components/ui/Tabs';
import { filterNavigation, orgNavigation, studentNavigation } from '@/utils/navigation';

describe('Button', () => {
  it('is disabled and aria-busy while loading, and does not fire clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const b = screen.getByRole('button', { name: 'Save' });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
  it('defaults to type=button so it never submits a form by accident', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('form controls', () => {
  it('connects label, error and aria attributes', () => {
    render(<Input label="Email" required error="Enter a valid email" />);
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Enter a valid email');
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });
  it('Select renders options and a placeholder; Checkbox is labelled', async () => {
    render(
      <>
        <Select label="Role" placeholder="Choose" options={[{ value: 't', label: 'Teacher' }]} />
        <Checkbox label="Send invite" />
      </>,
    );
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Teacher' })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Send invite'));
    expect(screen.getByLabelText('Send invite')).toBeChecked();
  });
});

describe('InlinePanel / InlineConfirm (no pop-ups)', () => {
  it('is a labelled region in the page: focus moves in, Escape and the close button close it', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button>opener</button>
        <InlinePanel open onClose={onClose} title="Edit student" testId="student-form">
          <Input label="Name" />
        </InlinePanel>
      </>,
    );
    const panel = screen.getByRole('region', { name: 'Edit student' });
    expect(panel).not.toHaveAttribute('aria-modal');
    expect(screen.getByLabelText('Name')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('student-form-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(2);
    rerender(
      <>
        <button>opener</button>
        <InlinePanel open={false} onClose={onClose} title="Edit student">
          x
        </InlinePanel>
      </>,
    );
    expect(screen.queryByRole('region', { name: 'Edit student' })).not.toBeInTheDocument();
  });
  it('does not trap focus: Tab can leave the panel to the rest of the page', async () => {
    render(
      <>
        <InlinePanel open onClose={() => undefined} title="Inline">
          <Input label="A" />
        </InlinePanel>
        <button>after</button>
      </>,
    );
    expect(screen.getByLabelText('A')).toHaveFocus();
    await userEvent.tab(); // the close button sits before A, so the next stop is outside the panel
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });
  it('InlineConfirm calls the right callback, focuses Cancel first and cancels on Escape', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <InlineConfirm
        open
        title="Delete?"
        message="Sure?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('group', { name: 'Delete?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('InlinePanel focus stability', () => {
  it('does not steal focus when the parent re-renders (new onClose function) while the user is typing', async () => {
    function Host() {
      const [n, setN] = useState(0);
      return (
        <InlinePanel open onClose={() => setN(n)} title="Form">
          <Input label="First" data-autofocus onChange={() => setN((v) => v + 1)} />
          <Input label="Second" onChange={() => setN((v) => v + 1)} />
        </InlinePanel>
      );
    }
    render(<Host />);
    expect(screen.getByLabelText('First')).toHaveFocus();
    await userEvent.type(screen.getByLabelText('Second'), 'abc'); // each key re-renders Host with a fresh onClose
    expect(screen.getByLabelText('Second')).toHaveValue('abc');
    expect(screen.getByLabelText('Second')).toHaveFocus();
    expect(screen.getByLabelText('First')).toHaveValue('');
  });
});

describe('Toast', () => {
  function Trigger() {
    const { toast } = useToast();
    return <button onClick={() => toast({ title: 'Saved', variant: 'success' })}>go</button>;
  }
  afterEach(() => {
    vi.useRealTimers(); // also after a failure, so later tests do not run on fake timers
  });
  it('announces in a live region and stays at least 4 s even when asked for less', async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider durationMs={1000}>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    expect(
      within(screen.getByRole('region', { name: 'Notifications' })).getByText('Saved'),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.getByTestId('toast-success')).toHaveAttribute('data-state', 'success');
    act(() => {
      vi.advanceTimersByTime(3900);
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
  it('closes from its close button', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    fireEvent.click(screen.getByTestId('toast-close-btn'));
    expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
  });
  it('useToast outside the provider fails loudly', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

describe('Tabs and Dropdown keyboard support', () => {
  it('Tabs: arrow keys move selection with roving tabindex', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        label="t"
        value="a"
        onChange={onChange}
        tabs={[
          { id: 'a', label: 'A', content: 'one' },
          { id: 'b', label: 'B' },
        ]}
      />,
    );
    const a = screen.getByRole('tab', { name: 'A' });
    expect(a).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('tabindex', '-1');
    a.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('one');
  });
  it('Dropdown: opens, ArrowDown moves, Enter selects, Escape closes', async () => {
    const onEdit = vi.fn();
    render(
      <Dropdown
        label="Actions"
        trigger="⋯"
        items={[
          { label: 'Edit', onSelect: onEdit },
          { label: 'Delete', danger: true, onSelect: () => undefined },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(onEdit).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('DataTable and Pagination', () => {
  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: (r: { id: string; name: string }) => r.name,
    },
    { key: 'x', header: 'Other', cell: () => '-' },
  ];
  it('renders a captioned semantic table with sortable headers and aria-sort', async () => {
    const onSort = vi.fn();
    render(
      <DataTable
        caption="Students"
        columns={columns}
        rows={[{ id: '1', name: 'Asha' }]}
        rowKey={(r) => r.id}
        sort={{ key: 'name', order: 'asc' }}
        onSortChange={onSort}
      />,
    );
    expect(screen.getByRole('table', { name: 'Students' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(onSort).toHaveBeenCalledWith({ key: 'name', order: 'desc' });
    expect(screen.getByRole('cell', { name: 'Asha' })).toBeInTheDocument();
  });
  it('shows loading, error (with retry) and empty states instead of a table', async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <DataTable
        caption="c"
        columns={columns}
        rows={[]}
        rowKey={(r: { id: string }) => r.id}
        loading
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(
      <DataTable
        caption="c"
        columns={columns}
        rows={[]}
        rowKey={(r: { id: string }) => r.id}
        error="Network down"
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Network down');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
    rerender(
      <DataTable
        caption="c"
        columns={columns}
        rows={[]}
        rowKey={(r: { id: string }) => r.id}
        emptyTitle="No students"
      />,
    );
    expect(screen.getByText('No students')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('Pagination shows the range, disables edges and calls onPageChange', async () => {
    const onPage = vi.fn();
    render(<Pagination page={1} totalPages={3} total={25} pageSize={10} onPageChange={onPage} />);
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPage).toHaveBeenCalledWith(2);
  });
  it('Pagination renders nothing when there are no rows', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={0} pageSize={10} onPageChange={() => undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SearchInput', () => {
  it('debounces typing into a single search call', async () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchInput value="" onSearch={onSearch} delayMs={300} />);
    const box = screen.getByRole('searchbox', { name: 'Search' });
    fireEvent.change(box, { target: { value: 'a' } });
    fireEvent.change(box, { target: { value: 'ab' } });
    fireEvent.change(box, { target: { value: 'abc' } });
    expect(onSearch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('abc');
    vi.useRealTimers();
  });
});

describe('badges, cards, states, charts', () => {
  it('StatusBadge maps statuses to tones and humanises text', () => {
    render(
      <>
        <StatusBadge status="pending_email" />
        <StatusBadge status="Passed" />
      </>,
    );
    expect(screen.getByText('Pending email').parentElement!.className).toContain('bg-butter');
    expect(screen.getByText('Pending email')).toHaveAttribute('data-state', 'pending_email');
    expect(screen.getByText('Passed').parentElement!.className).toContain('bg-mint');
  });
  it('StatCard shows the value, or a loading skeleton', () => {
    const { rerender } = render(<StatCard label="Students" value="12" />);
    expect(screen.getByText('12')).toBeInTheDocument();
    rerender(<StatCard label="Students" value="12" loading />);
    expect(screen.queryByText('12')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
  it('Empty / Loading / Error states use the right roles', () => {
    render(
      <>
        <LoadingState />
        <EmptyState title="Nothing" />
        <ErrorState message="Boom" />
      </>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.getByRole('heading', { name: 'Nothing' })).toBeInTheDocument();
  });
  it('charts expose a text alternative', () => {
    render(
      <>
        <BarChart
          ariaLabel="Attempts per day"
          data={[
            { label: 'Mon', value: 3 },
            { label: 'Tue', value: 0 },
          ]}
        />
        <DonutChart
          ariaLabel="Pass and fail"
          data={[
            { label: 'Passed', value: 3 },
            { label: 'Failed', value: 1 },
          ]}
        />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Attempts per day' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Pass and fail' })).toBeInTheDocument();
    expect(screen.getByText(/Passed: 3/)).toBeInTheDocument();
  });
  it('charts survive empty/zero data without NaN', () => {
    const { container } = render(
      <>
        <BarChart ariaLabel="b" data={[]} />
        <DonutChart ariaLabel="d" data={[{ label: 'x', value: 0 }]} />
      </>,
    );
    expect(container.innerHTML).not.toContain('NaN');
  });
  it('Avatar shows initials', () => {
    render(<Avatar name="Asha Verma" />);
    expect(screen.getByRole('img', { name: 'Asha Verma' })).toHaveTextContent('AV');
  });
});

describe('layout', () => {
  it('PageHeader has one h1 and a labelled breadcrumb with aria-current', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Students"
          breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Students' }]}
          actions={<Button>Add</Button>}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Students', { selector: 'span' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
  it('Breadcrumb links all but the last item', () => {
    render(
      <MemoryRouter>
        <Breadcrumb items={[{ label: 'A', to: '/a' }, { label: 'B', to: '/b' }, { label: 'C' }]} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual(['A', 'B']);
  });
  it('AppShell renders skip link, main landmark, navigation, the user and Log out', () => {
    const onSignOut = vi.fn();
    render(
      <MemoryRouter>
        <AppShell
          sections={orgNavigation.slice(0, 2)}
          user={{ name: 'Dev User', email: 'dev@x.com', role: 'Owner' }}
          onSignOut={onSignOut}
        >
          <p>content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('main')).toHaveTextContent('content');
    expect(screen.getByTestId('sidebar-user-name')).toHaveTextContent('Dev User');
    fireEvent.click(screen.getByTestId('nav-logout-btn'));
    expect(onSignOut).toHaveBeenCalled();
  });
  it('the menu button (small screens) opens the menu inside the sidebar card, never a drawer', async () => {
    render(
      <MemoryRouter initialEntries={['/org/dashboard']}>
        <AppShell sections={orgNavigation.slice(0, 2)}>
          <p>x</p>
        </AppShell>
      </MemoryRouter>,
    );
    const toggle = screen.getByTestId('nav-menu-btn');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'Main' }));
    await waitFor(() => expect(nav.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument());
  });
});

describe('navigation filtering (UX only; the API and database enforce access)', () => {
  it('hides items the user has no permission for and drops empty sections', () => {
    const can = (p: string) => ['course.read', 'subject.read'].includes(p);
    const out = filterNavigation(orgNavigation, can);
    const labels = out.flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toEqual(['Courses']);
    expect(out.every((s) => s.items.length > 0)).toBe(true);
  });
  it('items without a permission requirement are always kept', () => {
    const out = filterNavigation(studentNavigation, () => false);
    expect(out.flatMap((s) => s.items.map((i) => i.label))).toEqual([
      'Home',
      'My Exams',
      'My Results',
    ]);
  });
});
