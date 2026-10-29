// PURPOSE: /org/exams (all exams), /org/exams/published (live exams) and /teacher/exams: list, filter, create.
// WHY: Guide Part 18 step 13. Teachers see the exams they created; owners/admins see all (RLS). Opening a row leads to
//      the exam page where questions, assignment and publishing are managed.
// DEPENDS ON: features/assessment/*, shared table/dialog components.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlinePanel } from '@/components/inline/Inline';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { ExamForm } from '@/features/assessment/ExamForm';
import { formatDateTime } from '@/features/assessment/format';
import { useAssessmentMutation, useExams } from '@/features/assessment/hooks';
import { Can } from '@/features/auth/Can';
import { examService } from '@/services/assessmentService';
import type { ExamBody, ExamStatus, ExamSummary } from '@/types/assessment';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
];

/** The new-exam form (its own page: /org/exams/new); after creating, the exam page opens to add questions. */
export function NewExamForm({
  open,
  onClose,
  className,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const base = useAreaBase();
  const create = useAssessmentMutation((b: ExamBody) => examService.create(b));
  if (!open) return null;
  return (
    <InlinePanel
      open
      onClose={onClose}
      title="New exam"
      testId="exam-form"
      {...(className ? { className } : {})}
      footer={
        <>
          <Button variant="outline" onClick={onClose} data-testid="exam-form-cancel-btn">
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-exam-form"
            loading={create.isPending}
            data-testid="exam-form-save-btn"
          >
            Create exam
          </Button>
        </>
      }
    >
      <ExamForm
        id="new-exam-form"
        exam={null}
        onSubmit={(body) =>
          create.mutate(body, {
            onSuccess: (exam) => {
              toast({
                title: 'Exam created',
                description: 'Now add questions and choose who takes it.',
                variant: 'success',
              });
              onClose();
              navigate(`${base}/exams/${exam.id}`);
            },
            onError: (e) =>
              toast({
                title: 'Could not create the exam',
                description: errorText(e),
                variant: 'error',
              }),
          })
        }
      />
    </InlinePanel>
  );
}

export default function ExamsPage({ publishedOnly = false }: { publishedOnly?: boolean }) {
  const navigate = useNavigate();
  const base = useAreaBase();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'createdAt', order: 'desc' });
  const effective = publishedOnly ? 'published' : status;
  const q = useExams({
    page,
    pageSize: PAGE_SIZE,
    sort: sort.key,
    order: sort.order,
    ...(search ? { search } : {}),
    ...(effective ? { status: effective as ExamStatus } : {}),
  });
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={publishedOnly ? 'Published Exams' : 'Exams'}
        description={
          publishedOnly
            ? 'Exams students can take now (within their open and close times).'
            : 'Create exams, add published questions, choose who takes them and publish.'
        }
        breadcrumb={[{ label: 'Exams' }, { label: publishedOnly ? 'Published Exams' : 'Exams' }]}
        actions={
          <Can permission="exam.create">
            <Button
              leftIcon={<Icon name="plus" size={16} />}
              onClick={() => navigate(`${base}/exams/new`)}
              data-testid="exams-add-btn"
            >
              New exam
            </Button>
          </Can>
        }
      />
      <Card padded={false}>
        <FilterBar
          canClear={Boolean(search || status)}
          onClear={() =>
            reset(() => {
              setSearch('');
              setStatus('');
            })
          }
        >
          <SearchInput
            value={search}
            onSearch={(v) => reset(() => setSearch(v))}
            placeholder="Search name or code"
            label="Search exams"
          />
          {!publishedOnly && (
            <div className="w-40">
              <Select
                label="Status"
                placeholder="Any status"
                value={status}
                options={STATUS_OPTIONS}
                onChange={(e) => reset(() => setStatus(e.target.value))}
              />
            </div>
          )}
        </FilterBar>
        <DataTable<ExamSummary>
          caption={publishedOnly ? 'Published exams' : 'Exams'}
          rows={q.data?.items ?? []}
          rowKey={(e) => e.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={(s) => reset(() => setSort(s))}
          emptyTitle={
            search || status
              ? 'No exams match your filters'
              : publishedOnly
                ? 'No published exams'
                : 'No exams yet'
          }
          columns={[
            {
              key: 'name',
              header: 'Exam',
              sortable: true,
              cell: (e) => (
                <button
                  type="button"
                  className="text-left"
                  onClick={() => navigate(`${base}/exams/${e.id}`)}
                  aria-label={`Open ${e.name}`}
                  data-testid="exam-row-open-btn"
                >
                  <span className="block font-medium text-primary hover:underline">{e.name}</span>
                  <span className="block font-mono text-xs text-muted">{e.examCode}</span>
                </button>
              ),
            },
            {
              key: 'questions',
              header: 'Questions',
              cell: (e) => `${e.questionCount} · ${e.totalMarks} marks`,
            },
            { key: 'duration', header: 'Duration', cell: (e) => `${e.durationMinutes} min` },
            {
              key: 'startAt',
              header: 'Opens',
              sortable: true,
              cell: (e) => formatDateTime(e.startAt),
            },
            { key: 'attempts', header: 'Attempts', cell: (e) => e.attemptCount },
            { key: 'status', header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
          ]}
          testId="exam"
          rowCode={(e) => e.examCode}
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
