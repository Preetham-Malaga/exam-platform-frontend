// PURPOSE: /org/assignments - every exam with who it is assigned to, and a shortcut to change the assignment.
// WHY: Guide Part 9.1: an exam reaches students only through its assignment (organization, unit, subject, students).
// DEPENDS ON: features/assessment/hooks.ts, shared table components.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Pagination } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { useExams } from '@/features/assessment/hooks';
import type { ExamSummary } from '@/types/assessment';

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const base = useAreaBase();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useExams({
    page,
    pageSize: 10,
    sort: 'createdAt',
    order: 'desc',
    ...(search ? { search } : {}),
  });

  return (
    <>
      <PageHeader
        title="Assignments"
        description="An exam is visible only to the groups it is assigned to."
        breadcrumb={[{ label: 'Exam Management' }, { label: 'Assignments' }]}
      />
      <Card padded={false}>
        <FilterBar>
          <SearchInput
            value={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search exams"
            label="Search exams"
          />
        </FilterBar>
        <DataTable<ExamSummary>
          caption="Exam assignments"
          rows={q.data?.items ?? []}
          rowKey={(e) => e.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          emptyTitle="No exams yet"
          columns={[
            {
              key: 'name',
              header: 'Exam',
              cell: (e) => (
                <div>
                  <p className="font-medium text-text">{e.name}</p>
                  <p className="font-mono text-xs text-muted">{e.examCode}</p>
                </div>
              ),
            },
            {
              key: 'assigned',
              header: 'Assigned to',
              cell: (e) =>
                e.assignmentCount ? (
                  <Badge tone="info">
                    {e.assignmentCount} group{e.assignmentCount === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <Badge tone="warning">Not assigned</Badge>
                ),
            },
            { key: 'status', header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              cell: (e) => (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Manage assignment of ${e.name}`}
                  onClick={() => navigate(`${base}/exams/${e.id}?tab=assignment`)}
                >
                  Manage
                </Button>
              ),
            },
          ]}
        />
        {q.data && (
          <Pagination
            page={q.data.pagination.page}
            totalPages={q.data.pagination.totalPages}
            total={q.data.pagination.total}
            pageSize={q.data.pagination.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </>
  );
}
