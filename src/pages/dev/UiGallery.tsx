// PURPOSE: Developer-only gallery (/dev/ui) to look at every shared component. Not included in production routes.
// WHY: Lets you check the theme, states and accessibility of Phase 2 components in a browser without any backend.
// DEPENDS ON: all shared components. The sample rows below exist ONLY for this dev page.

import { useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { useToast } from '@/components/feedback/Toast';
import { Checkbox, Input, Radio, Select, Textarea } from '@/components/forms/Form';
import { BarChart, DonutChart } from '@/components/charts/Charts';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlineConfirm, InlinePanel } from '@/components/inline/Inline';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, ChartCard, StatCard } from '@/components/ui/Card';
import { Dropdown } from '@/components/ui/Dropdown';
import { Tabs } from '@/components/ui/Tabs';

const SAMPLE = [
  { id: '1', name: 'Asha Verma', roll: 'CSE-001', status: 'active' },
  { id: '2', name: 'Ravi Kumar', roll: 'CSE-002', status: 'inactive' },
  { id: '3', name: 'Meera Nair', roll: 'CSE-003', status: 'active' },
];

export default function UiGallery() {
  const { toast } = useToast();
  const [panel, setPanel] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [tab, setTab] = useState('a');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'name', order: 'asc' });
  const [page, setPage] = useState(1);

  return (
    <>
      <PageHeader
        title="UI gallery"
        description="Every shared component in the Exam Platform theme (development only)."
        breadcrumb={[{ label: 'Dev' }, { label: 'UI gallery' }]}
        actions={<Button leftIcon={null}>Primary action</Button>}
      />
      <div className="grid gap-5">
        <Card title="Buttons and badges">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge status="published" />
            <StatusBadge status="draft" />
            <StatusBadge status="Passed" />
            <StatusBadge status="Failed" />
            <StatusBadge status="pending_email" />
            <Badge tone="info">Info</Badge>
            <Avatar name="Asha Verma" />
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total students" value="1,248" icon="users" />
          <StatCard label="Exams" value="32" icon="file" />
          <StatCard label="Pass rate" value="86%" icon="check" hint="Last 30 days" />
          <StatCard label="Loading" value="" icon="chart" loading />
        </div>
        <Card title="Form controls">
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <Input label="Full name" required placeholder="Type here" />
            <Input label="With error" error="This field is required" defaultValue="" />
            <Select
              label="Role"
              placeholder="Select a role"
              options={[
                { value: 't', label: 'Teacher' },
                { value: 's', label: 'Student' },
              ]}
            />
            <Textarea label="Notes" rows={2} hint="Optional" />
            <Checkbox label="Send invitation email" description="They will get a sign-in link" />
            <div className="flex gap-4">
              <Radio name="r" label="Yes" defaultChecked />
              <Radio name="r" label="No" />
            </div>
          </div>
        </Card>
        <Card title="Table with search, sort and pagination" padded={false}>
          <FilterBar>
            <SearchInput value={search} onSearch={setSearch} />
          </FilterBar>
          <DataTable
            caption="Sample students"
            rows={SAMPLE.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))}
            rowKey={(r) => r.id}
            sort={sort}
            onSortChange={setSort}
            columns={[
              {
                key: 'name',
                header: 'Name',
                sortable: true,
                cell: (r) => <span className="font-medium">{r.name}</span>,
              },
              { key: 'roll', header: 'Roll no.', sortable: true, cell: (r) => r.roll },
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                cell: () => (
                  <Dropdown
                    label="Row actions"
                    trigger={<span>⋯</span>}
                    items={[
                      { label: 'Edit', onSelect: () => toast({ title: 'Edit clicked' }) },
                      { label: 'Delete', danger: true, onSelect: () => setConfirm(true) },
                    ]}
                  />
                ),
              },
            ]}
          />
          <Pagination page={page} totalPages={5} total={42} pageSize={10} onPageChange={setPage} />
        </Card>
        <Card title="Inline forms, confirmations, toasts and tabs">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPanel(true)}>
              Open inline form
            </Button>
            <Button variant="outline" onClick={() => setConfirm(true)}>
              Ask to confirm
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({ title: 'Saved', description: 'Changes were saved.', variant: 'success' })
              }
            >
              Success toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({ title: 'Failed', description: 'Try again.', variant: 'error' })
              }
            >
              Error toast
            </Button>
          </div>
          <InlinePanel
            open={panel}
            onClose={() => setPanel(false)}
            title="Example inline form"
            className="mt-4"
            footer={
              <>
                <Button variant="outline" onClick={() => setPanel(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setPanel(false)}>Save</Button>
              </>
            }
          >
            <Input label="Name" data-autofocus />
          </InlinePanel>
          <InlineConfirm
            open={confirm}
            className="mt-4"
            title="Delete student?"
            message="This cannot be undone."
            confirmLabel="Delete"
            onCancel={() => setConfirm(false)}
            onConfirm={() => setConfirm(false)}
          />
          <div className="mt-4">
            <Tabs
              label="Demo tabs"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'a', label: 'First', content: 'First tab content' },
                { id: 'b', label: 'Second', content: 'Second tab content' },
              ]}
            />
          </div>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Attempts (14 days)">
            <BarChart
              ariaLabel="Attempts per day"
              data={Array.from({ length: 14 }, (_, i) => ({
                label: `D${i + 1}`,
                value: (i * 7) % 11,
              }))}
            />
          </ChartCard>
          <ChartCard title="Pass / fail">
            <DonutChart
              ariaLabel="Pass and fail counts"
              data={[
                { label: 'Passed', value: 42 },
                { label: 'Failed', value: 11 },
                { label: 'Pending', value: 4 },
              ]}
            />
          </ChartCard>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Loading">
            <LoadingState compact />
          </Card>
          <Card title="Empty">
            <EmptyState
              compact
              title="No students yet"
              description="Add your first student to get started."
            />
          </Card>
          <Card title="Error">
            <ErrorState
              compact
              message="The server could not be reached."
              onRetry={() => undefined}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
