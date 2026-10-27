// PURPOSE: /org/reports - exam performance (attempts, average, pass/fail), question performance for one exam (how many
//          got each question right) and student performance (average and best per student).
// WHY: Guide Part 18 step 17 "basic reports". Numbers are computed on the server inside the caller's RLS scope.
// DEPENDS ON: features/assessment/hooks.ts + format.ts, components/charts/Charts.tsx, shared UI.

import { useState } from 'react';
import { BarChart } from '@/components/charts/Charts';
import { Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { errorText } from '@/features/academic/ui';
import {
  DIFFICULTY_TONE,
  formatDateTime,
  formatDuration,
  formatPercent,
} from '@/features/assessment/format';
import {
  useExamPerformance,
  useExams,
  useQuestionPerformance,
  useStudentPerformance,
} from '@/features/assessment/hooks';
import type { ExamPerformance, QuestionPerformance, StudentPerformance } from '@/types/assessment';

function ExamReport() {
  const q = useExamPerformance();
  const items = q.data?.items ?? [];
  const charted = items.filter((e) => e.attempts > 0).slice(0, 10);
  return (
    <div className="grid gap-4">
      {charted.length > 0 && (
        <Card title="Average score by exam">
          <BarChart
            ariaLabel="Average percentage by exam"
            data={charted.map((e) => ({ label: e.examCode, value: e.averagePercentage ?? 0 }))}
          />
        </Card>
      )}
      <Card padded={false}>
        <DataTable<ExamPerformance>
          caption="Exam performance"
          rows={items}
          rowKey={(e) => e.examId}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          emptyTitle="No published exams yet"
          columns={[
            {
              key: 'exam',
              header: 'Exam',
              cell: (e) => (
                <div>
                  <p className="font-medium text-text">{e.examName}</p>
                  <p className="font-mono text-xs text-muted">{e.examCode}</p>
                </div>
              ),
            },
            { key: 'status', header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
            {
              key: 'attempts',
              header: 'Attempts',
              cell: (e) => `${e.attempts} (${e.students} students)`,
            },
            { key: 'avg', header: 'Average', cell: (e) => formatPercent(e.averagePercentage) },
            {
              key: 'range',
              header: 'Lowest – highest',
              cell: (e) =>
                e.attempts
                  ? `${formatPercent(e.lowestPercentage)} – ${formatPercent(e.highestPercentage)}`
                  : '—',
            },
            {
              key: 'pass',
              header: 'Passed / failed',
              cell: (e) => (
                <span>
                  <span className="text-success">{e.passed}</span> /{' '}
                  <span className="text-error">{e.failed}</span>
                  {e.attempts ? (
                    <span className="text-xs text-muted">
                      {' '}
                      ({formatPercent((100 * e.passed) / e.attempts)})
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              key: 'time',
              header: 'Avg time',
              cell: (e) => formatDuration(e.averageDurationSeconds),
            },
          ]}
        />
      </Card>
    </div>
  );
}

function QuestionReport() {
  const [exam, setExam] = useState('');
  const exams = useExams({ page: 1, pageSize: 100, sort: 'createdAt', order: 'desc' });
  const q = useQuestionPerformance(exam);
  return (
    <Card padded={false}>
      <FilterBar>
        <div className="w-72">
          <Select
            label="Exam"
            placeholder="Choose an exam"
            value={exam}
            options={(exams.data?.items ?? [])
              .filter((e) => e.status !== 'draft')
              .map((e) => ({ value: e.id, label: e.name }))}
            onChange={(e) => setExam(e.target.value)}
          />
        </div>
      </FilterBar>
      {!exam ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Choose an exam to see how each question went.
        </p>
      ) : (
        <DataTable<QuestionPerformance>
          caption="Question performance"
          rows={q.data?.items ?? []}
          rowKey={(r) => r.questionId}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          emptyTitle="This exam has no questions"
          columns={[
            { key: 'pos', header: '#', className: 'w-10', cell: (r) => r.position },
            {
              key: 'text',
              header: 'Question',
              cell: (r) => <span className="line-clamp-2">{r.questionText}</span>,
            },
            {
              key: 'diff',
              header: 'Difficulty',
              cell: (r) => (
                <Badge tone={DIFFICULTY_TONE[r.difficulty] ?? 'neutral'}>{r.difficulty}</Badge>
              ),
            },
            { key: 'answered', header: 'Answered', cell: (r) => `${r.answered} / ${r.attempts}` },
            {
              key: 'correct',
              header: 'Correct',
              cell: (r) =>
                `${r.correct} (${r.attempts ? formatPercent((100 * r.correct) / r.attempts) : '—'})`,
            },
            { key: 'wrong', header: 'Wrong', cell: (r) => r.wrong },
          ]}
        />
      )}
    </Card>
  );
}

function StudentReport() {
  const [search, setSearch] = useState('');
  const q = useStudentPerformance(search);
  return (
    <Card padded={false}>
      <FilterBar>
        <SearchInput
          value={search}
          onSearch={setSearch}
          placeholder="Student name or roll no."
          label="Search students"
        />
      </FilterBar>
      <DataTable<StudentPerformance>
        caption="Student performance"
        rows={q.data?.items ?? []}
        rowKey={(r) => r.studentId}
        loading={q.isPending}
        error={q.isError ? errorText(q.error) : undefined}
        emptyTitle="No student has a result yet"
        columns={[
          {
            key: 'student',
            header: 'Student',
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
          { key: 'exams', header: 'Exams', cell: (r) => r.examsTaken },
          { key: 'avg', header: 'Average', cell: (r) => formatPercent(r.averagePercentage) },
          { key: 'best', header: 'Best', cell: (r) => formatPercent(r.bestPercentage) },
          { key: 'passed', header: 'Passed', cell: (r) => `${r.passed} / ${r.examsTaken}` },
          { key: 'last', header: 'Last result', cell: (r) => formatDateTime(r.lastResultAt) },
        ]}
      />
    </Card>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState('exams');
  return (
    <>
      <PageHeader
        title="Reports"
        description="How exams, questions and students are doing."
        breadcrumb={[{ label: 'Insights' }, { label: 'Reports' }]}
      />
      <Tabs
        label="Reports"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'exams', label: 'Exam performance', content: <ExamReport /> },
          { id: 'questions', label: 'Question performance', content: <QuestionReport /> },
          { id: 'students', label: 'Student performance', content: <StudentReport /> },
        ]}
      />
    </>
  );
}
