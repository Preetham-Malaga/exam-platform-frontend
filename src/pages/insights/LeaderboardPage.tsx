// PURPOSE: /org/leaderboard and /student/leaderboard - rankings for the whole organization, one exam, a unit or a subject.
// WHY: app.leaderboard ranks best results (score, then time). Students see only exams that enable a leaderboard and
//      are assigned to them; their own row is highlighted.
// DEPENDS ON: features/assessment/hooks.ts, features/academic (units, subjects), shared UI.

import { useMemo, useState } from 'react';
import { Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { FilterBar } from '@/components/tables/FilterBar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { usePermissions } from '@/contexts/PermissionContext';
import { useSubjects, useUnitTree } from '@/features/academic/hooks';
import { unitOptions } from '@/features/academic/tree';
import { errorText } from '@/features/academic/ui';
import { formatDuration, formatPercent } from '@/features/assessment/format';
import { useExams, useLeaderboard, useMyResults } from '@/features/assessment/hooks';
import type { LeaderboardRow, LeaderboardScope } from '@/types/assessment';
import { cn } from '@/utils/cn';

export default function LeaderboardPage() {
  const perms = usePermissions();
  const staff = perms.can('exam.read');
  const [scope, setScope] = useState<LeaderboardScope>('organization');
  const [scopeId, setScopeId] = useState('');
  const exams = useExams({ page: 1, pageSize: 100, sort: 'createdAt', order: 'desc' }, staff);
  const mine = useMyResults();
  const tree = useUnitTree();
  const subjects = useSubjects({ page: 1, pageSize: 100, sort: 'name' }, staff);
  const lb = useLeaderboard(scope, scopeId || undefined);

  const scopeOptions = useMemo(() => {
    if (scope === 'exam')
      return staff
        ? (exams.data?.items ?? []).map((e) => ({ value: e.id, label: e.name }))
        : [
            ...new Map(
              (mine.data?.items ?? [])
                .filter((r) => r.leaderboardEnabled)
                .map((r) => [r.examId, r.examName]),
            ),
          ].map(([value, label]) => ({ value, label }));
    if (scope === 'academic_unit') return unitOptions(tree.data?.units ?? []);
    if (scope === 'subject')
      return (subjects.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }));
    return [];
  }, [scope, staff, exams.data, mine.data, tree.data, subjects.data]);

  const scopes = [
    { value: 'organization', label: 'Whole organization' },
    { value: 'exam', label: 'One exam' },
    ...(staff
      ? [
          { value: 'academic_unit', label: 'Academic unit' },
          { value: 'subject', label: 'Subject' },
        ]
      : []),
  ];
  const label = scopes.find((s) => s.value === scope)?.label ?? '';

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="Ranked by each student's best score, then the shorter time."
        breadcrumb={[{ label: 'Insights' }, { label: 'Leaderboard' }]}
      />
      <Card padded={false}>
        <FilterBar>
          <div className="w-52">
            <Select
              label="Ranking"
              value={scope}
              options={scopes}
              onChange={(e) => {
                setScope(e.target.value as LeaderboardScope);
                setScopeId('');
              }}
            />
          </div>
          {scope !== 'organization' && (
            <div className="w-64">
              <Select
                label={label}
                placeholder="Choose…"
                value={scopeId}
                options={scopeOptions}
                onChange={(e) => setScopeId(e.target.value)}
              />
            </div>
          )}
        </FilterBar>
        {scope !== 'organization' && !scopeId ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Choose {label.toLowerCase()} to see its ranking.
          </p>
        ) : (
          <DataTable<LeaderboardRow>
            caption="Leaderboard"
            rows={lb.data?.items ?? []}
            rowKey={(r) => r.studentId}
            loading={lb.isPending}
            error={lb.isError ? errorText(lb.error) : undefined}
            onRetry={() => void lb.refetch()}
            emptyTitle="No results to rank yet"
            columns={[
              {
                key: 'rank',
                header: 'Rank',
                className: 'w-16',
                cell: (r) => (
                  <span className={cn('font-bold', r.rank <= 3 ? 'text-primary' : 'text-text')}>
                    {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                  </span>
                ),
              },
              {
                key: 'student',
                header: 'Student',
                cell: (r) => (
                  <span className={cn(r.isMe && 'font-semibold')}>
                    {r.studentName} {r.isMe && <Badge tone="info">You</Badge>}
                  </span>
                ),
              },
              {
                key: 'pct',
                header: scope === 'exam' ? 'Percentage' : 'Average %',
                cell: (r) => formatPercent(r.percentage),
              },
              { key: 'score', header: 'Score', cell: (r) => r.score },
              ...(scope === 'exam'
                ? []
                : [{ key: 'exams', header: 'Exams', cell: (r: LeaderboardRow) => r.examsTaken }]),
              { key: 'time', header: 'Time', cell: (r) => formatDuration(r.durationSeconds) },
            ]}
          />
        )}
      </Card>
    </>
  );
}
