// PURPOSE: /student/results - the signed-in student's results (only exams that show results).
// WHY: app.my_results returns only the student's own results and hides exams with "show results" switched off.
// DEPENDS ON: features/assessment/hooks.ts + format.ts, shared table components.

import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
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
import { useMyResults } from '@/features/assessment/hooks';
import type { MyResult } from '@/types/assessment';

export default function StudentResultsPage() {
  const navigate = useNavigate();
  const q = useMyResults();
  return (
    <>
      <PageHeader
        title="My Results"
        description="Your submitted exams."
        breadcrumb={[{ label: 'Results' }]}
      />
      <Card padded={false}>
        <DataTable<MyResult>
          caption="My results"
          rows={q.data?.items ?? []}
          rowKey={(r) => r.resultId}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          emptyTitle="No results yet"
          columns={[
            {
              key: 'exam',
              header: 'Exam',
              cell: (r) => <span className="font-medium text-text">{r.examName}</span>,
            },
            { key: 'score', header: 'Score', cell: (r) => `${r.score} / ${r.maximumScore}` },
            { key: 'pct', header: 'Percentage', cell: (r) => formatPercent(r.percentage) },
            {
              key: 'status',
              header: 'Result',
              cell: (r) => <Badge tone={RESULT_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>,
            },
            { key: 'time', header: 'Time taken', cell: (r) => formatDuration(r.durationSeconds) },
            { key: 'date', header: 'Submitted', cell: (r) => formatDateTime(r.evaluatedAt) },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              cell: (r) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/student/results/${r.attemptId}`)}
                  aria-label={`View result of ${r.examName}`}
                >
                  View
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
