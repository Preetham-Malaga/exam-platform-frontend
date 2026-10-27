// PURPOSE: /student/dashboard - what a student needs first: exams open now, recent results and their average.
// WHY: Built from the student's own endpoints (available exams, own results); students hold no report permission.
// DEPENDS ON: features/assessment/hooks.ts + format.ts, shared UI.

import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/feedback/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, StatCard } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { RESULT_TONE, formatDateTime, formatPercent } from '@/features/assessment/format';
import { useAvailableExams, useMyResults } from '@/features/assessment/hooks';

export default function StudentDashboardPage() {
  const { me } = useAuth();
  const exams = useAvailableExams();
  const results = useMyResults();
  const items = results.data?.items ?? [];
  const avg = items.length ? items.reduce((s, r) => s + r.percentage, 0) / items.length : null;
  const passed = items.filter((r) => r.status === 'Passed').length;
  const open = exams.data?.items ?? [];

  return (
    <>
      <PageHeader
        title={`Hello, ${me?.user.fullName || 'student'}`}
        description="Your exams and results at a glance."
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Exams open now"
          value={open.length}
          icon="file"
          loading={exams.isPending}
        />
        <StatCard
          label="Exams completed"
          value={items.length}
          icon="check"
          loading={results.isPending}
        />
        <StatCard
          label="Average score"
          value={formatPercent(avg)}
          hint={items.length ? `${passed} passed` : undefined}
          icon="chart"
          loading={results.isPending}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Open exams"
          actions={
            <Link className="text-sm font-medium text-primary underline" to="/student/exams">
              All exams
            </Link>
          }
        >
          {open.length === 0 ? (
            <EmptyState icon="file" title="Nothing to take right now" />
          ) : (
            <ul className="grid gap-2">
              {open.slice(0, 5).map((e) => (
                <li
                  key={e.examId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <span>
                    <span className="block font-medium text-text">{e.name}</span>
                    <span className="block text-xs text-muted">
                      {e.durationMinutes} min · closes {formatDateTime(e.endAt)}
                    </span>
                  </span>
                  {e.runningAttemptId ? <Badge tone="warning">In progress</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title="Recent results"
          actions={
            <Link className="text-sm font-medium text-primary underline" to="/student/results">
              All results
            </Link>
          }
        >
          {items.length === 0 ? (
            <EmptyState icon="chart" title="No results yet" />
          ) : (
            <ul className="grid gap-2">
              {items.slice(0, 5).map((r) => (
                <li
                  key={r.resultId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <span>
                    <span className="block font-medium text-text">{r.examName}</span>
                    <span className="block text-xs text-muted">
                      {formatDateTime(r.evaluatedAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatPercent(r.percentage)}</span>
                    <Badge tone={RESULT_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
