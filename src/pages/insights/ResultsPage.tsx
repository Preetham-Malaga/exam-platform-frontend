// PURPOSE: /org/results and /teacher/results - every result the caller may see, filterable by exam and outcome, with a
//          per-attempt panel (opens under the row) showing each answer next to the correct one.
// WHY: Guide Part 18 step 16. Teachers see only results of exams they created (RLS); students use /student/results.
// DEPENDS ON: features/assessment/*, shared table/dialog components.

import { useState } from 'react';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlinePanel } from '@/components/inline/Inline';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { errorText } from '@/features/academic/ui';
import {
  RESULT_TONE,
  formatDateTime,
  formatDuration,
  formatPercent,
} from '@/features/assessment/format';
import { useExams, useResult, useResults } from '@/features/assessment/hooks';
import type { ResultRow } from '@/types/assessment';
import { cn } from '@/utils/cn';

function ResultDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const r = useResult(id);
  return (
    <InlinePanel
      open={Boolean(id)}
      onClose={onClose}
      title={r.data ? `${r.data.studentName} · ${r.data.examName}` : 'Result'}
      testId="result-detail"
    >
      {r.isPending ? (
        <LoadingState compact />
      ) : r.isError || !r.data ? (
        <ErrorState compact message={errorText(r.error)} />
      ) : (
        <div className="grid gap-4">
          <dl
            className="grid max-w-md grid-cols-2 gap-y-1 text-sm"
            data-testid="result-detail-summary"
          >
            <dt className="text-muted">Score</dt>
            <dd>
              {r.data.score} / {r.data.maximumScore} ({formatPercent(r.data.percentage)})
            </dd>
            <dt className="text-muted">Result</dt>
            <dd>
              <Badge tone={RESULT_TONE[r.data.status] ?? 'neutral'}>{r.data.status}</Badge>
            </dd>
            <dt className="text-muted">Time taken</dt>
            <dd>{formatDuration(r.data.durationSeconds)}</dd>
            <dt className="text-muted">Submitted</dt>
            <dd>
              {formatDateTime(r.data.submittedAt)}
              {r.data.autoSubmitted ? ' (time ran out)' : ''}
            </dd>
          </dl>
          <ol className="grid gap-3" aria-label="Answers">
            {r.data.answers.map((a) => (
              <li
                key={a.questionId}
                className="rounded-lg border border-border p-3"
                data-testid="result-detail-answer"
                data-entity-id={a.questionId}
                data-state={a.selectedOptionId ? (a.isCorrect ? 'correct' : 'wrong') : 'unanswered'}
              >
                <p className="mb-2 text-sm font-medium text-text">
                  {a.position}. {a.questionText}
                </p>
                <ul className="grid gap-1">
                  {a.options.map((o) => (
                    <li
                      key={o.id}
                      className={cn(
                        'rounded px-2 py-1 text-sm',
                        o.id === a.correctOptionId
                          ? 'bg-success/15'
                          : o.id === a.selectedOptionId
                            ? 'bg-error/15'
                            : '',
                      )}
                    >
                      {o.text}
                      {o.id === a.correctOptionId && (
                        <span className="ml-2 text-xs font-semibold text-success">correct</span>
                      )}
                      {o.id === a.selectedOptionId && (
                        <span className="ml-2 text-xs font-semibold">← answer</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted">
                  {a.selectedOptionId ? (a.isCorrect ? 'Correct' : 'Wrong') : 'Not answered'} ·{' '}
                  {a.marksAwarded}/{a.marks} marks
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </InlinePanel>
  );
}

export default function ResultsPage() {
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'evaluatedAt', order: 'desc' });
  const [open, setOpen] = useState<string | null>(null);
  const exams = useExams({ page: 1, pageSize: 100, sort: 'createdAt', order: 'desc' });
  const q = useResults({
    page,
    pageSize: 10,
    ...(search ? { search } : {}),
    ...(exam ? { examId: exam } : {}),
    ...(status ? { status } : {}),
  });
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const rows = [...(q.data?.items ?? [])].sort((a, b) => {
    if (sort.key === 'evaluatedAt') return 0; // server order
    const dir = sort.order === 'asc' ? 1 : -1;
    const k = sort.key as keyof ResultRow;
    return String(a[k]).localeCompare(String(b[k]), undefined, { numeric: true }) * dir;
  });

  return (
    <>
      <PageHeader
        title="Results"
        description="Submitted attempts, evaluated on the server."
        breadcrumb={[{ label: 'Insights' }, { label: 'Results' }]}
      />
      <Card padded={false}>
        <FilterBar
          canClear={Boolean(search || exam || status)}
          onClear={() =>
            reset(() => {
              setSearch('');
              setExam('');
              setStatus('');
            })
          }
        >
          <SearchInput
            value={search}
            onSearch={(v) => reset(() => setSearch(v))}
            placeholder="Student name or roll no."
            label="Search results"
          />
          <div className="w-60">
            <Select
              label="Exam"
              placeholder="All exams"
              value={exam}
              options={(exams.data?.items ?? []).map((e) => ({ value: e.id, label: e.name }))}
              onChange={(e) => reset(() => setExam(e.target.value))}
            />
          </div>
          <div className="w-36">
            <Select
              label="Result"
              placeholder="Any"
              value={status}
              options={[
                { value: 'Passed', label: 'Passed' },
                { value: 'Failed', label: 'Failed' },
                { value: 'Pending', label: 'Pending' },
              ]}
              onChange={(e) => reset(() => setStatus(e.target.value))}
            />
          </div>
        </FilterBar>
        <DataTable<ResultRow>
          caption="Results"
          rows={rows}
          rowKey={(r) => r.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={setSort}
          emptyTitle={search || exam || status ? 'No results match your filters' : 'No results yet'}
          columns={[
            {
              key: 'studentName',
              header: 'Student',
              sortable: true,
              cell: (r) => (
                <div>
                  <p className="font-medium text-text">{r.studentName}</p>
                  <p className="text-xs text-muted">
                    {r.rollNumber}
                    {r.academicUnitName ? ` · ${r.academicUnitName}` : ''}
                  </p>
                </div>
              ),
            },
            { key: 'examName', header: 'Exam', sortable: true, cell: (r) => r.examName },
            { key: 'score', header: 'Score', cell: (r) => `${r.score} / ${r.maximumScore}` },
            {
              key: 'percentage',
              header: '%',
              sortable: true,
              cell: (r) => formatPercent(r.percentage),
            },
            {
              key: 'status',
              header: 'Result',
              cell: (r) => <Badge tone={RESULT_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>,
            },
            { key: 'time', header: 'Time', cell: (r) => formatDuration(r.durationSeconds) },
            {
              key: 'evaluatedAt',
              header: 'Submitted',
              sortable: true,
              cell: (r) => formatDateTime(r.evaluatedAt),
            },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              cell: (r) => (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`View answers of ${r.studentName}`}
                  aria-expanded={open === r.id}
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  data-testid="result-row-view-btn"
                >
                  View
                </Button>
              ),
            },
          ]}
          testId="result"
          expandedRow={(r) =>
            open === r.id ? <ResultDetail id={r.id} onClose={() => setOpen(null)} /> : null
          }
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
