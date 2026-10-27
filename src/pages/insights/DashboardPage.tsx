// PURPOSE: /org/dashboard and /teacher/dashboard - totals, the last 30 days (results, average, pass rate), results per
//          day for two weeks, recent results and the most-taken exams.
// WHY: One optimized API call (GET /organizations/current/dashboard); RLS scopes it, so a teacher sees their exams only.
// DEPENDS ON: features/assessment/hooks.ts + format.ts, components/charts/Charts.tsx, shared UI.

import { Link } from 'react-router-dom';
import { BarChart } from '@/components/charts/Charts';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, StatCard } from '@/components/ui/Card';
import { usePermissions } from '@/contexts/PermissionContext';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { RESULT_TONE, formatDateTime, formatPercent } from '@/features/assessment/format';
import { useDashboard } from '@/features/assessment/hooks';

export default function DashboardPage() {
  const q = useDashboard();
  const perms = usePermissions();
  const base = useAreaBase();
  const t = q.data?.totals;
  const loading = q.isPending;

  if (q.isError)
    return <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          perms.isOrgAdmin
            ? 'Your organization at a glance.'
            : 'Your exams and their results at a glance.'
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {perms.isOrgAdmin ? (
          <>
            <StatCard label="Students" value={t?.students ?? 0} icon="users" loading={loading} />
            <StatCard label="Teachers" value={t?.teachers ?? 0} icon="user" loading={loading} />
          </>
        ) : (
          <>
            <StatCard
              label="Subjects in your scope"
              value={t?.subjects ?? 0}
              icon="book"
              loading={loading}
            />
            <StatCard
              label="Exams in progress now"
              value={t?.attemptsInProgress ?? 0}
              icon="clock"
              loading={loading}
            />
          </>
        )}
        <StatCard
          label="Questions"
          value={t?.questions ?? 0}
          hint={t ? `${t.publishedQuestions} published` : undefined}
          icon="help"
          loading={loading}
        />
        <StatCard
          label="Exams"
          value={t?.exams ?? 0}
          hint={t ? `${t.publishedExams} published` : undefined}
          icon="file"
          loading={loading}
        />
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Results (30 days)"
          value={q.data?.last30Days.results ?? 0}
          icon="check"
          loading={loading}
        />
        <StatCard
          label="Average score (30 days)"
          value={formatPercent(q.data?.last30Days.averagePercentage)}
          icon="chart"
          loading={loading}
        />
        <StatCard
          label="Pass rate (30 days)"
          value={formatPercent(q.data?.last30Days.passRate)}
          icon="trophy"
          loading={loading}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Results per day (last 14 days)">
          <BarChart
            ariaLabel="Results per day for the last 14 days"
            data={(q.data?.resultsByDay ?? []).map((d) => ({
              label: d.day.slice(5),
              value: d.results,
            }))}
          />
        </Card>
        <Card title="Most taken exams (30 days)">
          {(q.data?.topExams ?? []).length === 0 ? (
            <EmptyState icon="file" title="No attempts yet" />
          ) : (
            <ul className="grid gap-2">
              {q.data!.topExams.map((e) => (
                <li key={e.examId} className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    className="font-medium text-primary hover:underline"
                    to={`${base}/exams/${e.examId}`}
                  >
                    {e.examName}
                  </Link>
                  <span className="text-muted">
                    {e.attempts} · {formatPercent(e.averagePercentage)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card
        className="mt-4"
        title="Recent results"
        actions={
          <Link className="text-sm font-medium text-primary underline" to={`${base}/results`}>
            All results
          </Link>
        }
      >
        {(q.data?.recentResults ?? []).length === 0 ? (
          <EmptyState
            icon="chart"
            title="No results yet"
            description="Results appear here as students submit exams."
          />
        ) : (
          <ul className="divide-y divide-border">
            {q.data!.recentResults.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-text">{r.studentName}</span>
                  <span className="text-muted"> · {r.examName}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted">{formatDateTime(r.evaluatedAt)}</span>
                  <span className="font-semibold">{formatPercent(r.percentage)}</span>
                  <Badge tone={RESULT_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
