// PURPOSE: /org/dashboard and /teacher/dashboard - the prototype's owner dashboard (vDashOwner): filters, six headline
//          tiles, the "From course to result" flow, exams submitted per day, needs-your-attention, the exams table, today,
//          teachers, top students and latest results.
// WHY: Everything comes from GET /organizations/current/overview in one request; RLS scopes it, so a teacher sees their
//      own exams and students. Filters live in the URL so a filtered view can be bookmarked or shared.
// DEPENDS ON: features/assessment/hooks.ts (useOverview, useExams), features/academic/hooks.ts, utils/dates.ts.

import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { useShellUser } from '@/components/layout/shellUser';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { useCatalogTree, useUnitTree } from '@/features/academic/hooks';
import { unitOptions } from '@/features/academic/tree';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { useExams, useOverview } from '@/features/assessment/hooks';
import type { ExamState, Overview, OverviewFilter, OverviewRange } from '@/types/overview';
import { cn } from '@/utils/cn';
import { fmtDate, fmtNumber, fmtTime } from '@/utils/dates';

const RANGES: Array<{ value: OverviewRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
];
type Tone = 'lav' | 'mint' | 'peach' | 'sky' | 'butter' | 'pink';
const TILE: Record<Tone | 'hero', string> = {
  lav: 'bg-lav [&_.lbl]:text-lav-ink [&_.chip]:text-lav-ink',
  mint: 'bg-mint [&_.lbl]:text-mint-ink [&_.chip]:text-mint-ink',
  peach: 'bg-peach [&_.lbl]:text-peach-ink [&_.chip]:text-peach-ink',
  sky: 'bg-sky [&_.lbl]:text-sky-ink [&_.chip]:text-sky-ink',
  butter: 'bg-butter [&_.lbl]:text-butter-ink [&_.chip]:text-butter-ink',
  pink: 'bg-pink [&_.lbl]:text-pink-ink [&_.chip]:text-pink-ink',
  hero: 'bg-hero text-on-hero [&_.lbl]:text-hero-muted',
};
const SQ: Record<Tone, string> = {
  lav: 'bg-lav text-lav-ink',
  mint: 'bg-mint text-mint-ink',
  peach: 'bg-peach text-peach-ink',
  sky: 'bg-sky text-sky-ink',
  butter: 'bg-butter text-butter-ink',
  pink: 'bg-pink text-pink-ink',
};
const PILL = {
  ok: 'bg-mint text-mint-ink',
  warn: 'bg-butter text-butter-ink',
  bad: 'bg-danger-bg text-danger',
  neutral: 'bg-bg text-ink',
  dark: 'bg-primary text-on-primary',
};
const pill =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold';
const card = 'flex min-w-0 flex-col gap-3.5 rounded-card bg-surface p-[22px]';
const row = 'flex flex-wrap items-center gap-3 rounded-row bg-row px-3 py-2.5';
const pct = (v: number | null | undefined) => (v == null ? '—' : `${Number(v.toFixed(1))}%`);

function StatusPill({ state }: { state: ExamState }) {
  const map = {
    draft: ['Draft', PILL.warn],
    published: ['Published', PILL.ok],
    closed: ['Closed', PILL.neutral],
  } as const;
  return (
    <span className={cn(pill, map[state][1])} data-state={state}>
      {map[state][0]}
    </span>
  );
}

function Tile({
  tone,
  label,
  value,
  chip,
  testId,
}: {
  tone: Tone | 'hero';
  label: string;
  value: ReactNode;
  chip?: ReactNode;
  testId: string;
}) {
  return (
    <div
      className={cn('flex flex-col justify-between gap-3.5 rounded-tile p-5', TILE[tone])}
      data-testid={`dashboard-tile-${testId}`}
    >
      <span className="lbl font-bold">{label}</span>
      <span
        className="num font-display text-[40px] font-extrabold leading-none tracking-[-.03em]"
        data-testid={`dashboard-tile-${testId}-value`}
      >
        {value}
      </span>
      {chip &&
        (tone === 'hero' ? (
          <span className="text-xs font-semibold text-hero-muted">{chip}</span>
        ) : (
          <span className="chip self-start rounded-full bg-surface px-2.5 py-1 text-xs font-bold">
            {chip}
          </span>
        ))}
    </div>
  );
}

function Stage(p: {
  n: number;
  id: string;
  title: string;
  icon: IconName;
  tone: Tone;
  big: ReactNode;
  bigLabel: string;
  lines: string[];
  status: string;
  statusTone: keyof typeof PILL;
  to: string;
}) {
  return (
    <Link
      to={p.to}
      className="flex min-w-[190px] flex-1 flex-col gap-2.5 rounded-row border border-border bg-surface-2 p-4 text-ink hover:border-accent hover:no-underline"
      data-testid={`dashboard-stage-${p.id}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('grid h-[38px] w-[38px] place-items-center rounded-xl', SQ[p.tone])}>
          <Icon name={p.icon} />
        </span>
        <span className="eyebrow">Step {p.n}</span>
      </div>
      <b className="text-base">{p.title}</b>
      <div>
        <span
          className="num font-display text-[34px] font-extrabold leading-none tracking-[-.02em]"
          data-testid={`dashboard-stage-${p.id}-value`}
        >
          {p.big}
        </span>{' '}
        <span className="text-xs font-semibold text-muted">{p.bigLabel}</span>
      </div>
      <div className="flex flex-col gap-0.5 text-[13px] text-muted">
        {p.lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <span
        className={cn(pill, PILL[p.statusTone], 'self-start')}
        data-testid={`dashboard-stage-${p.id}-status`}
      >
        {p.status}
      </span>
    </Link>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Flow({ d, base }: { d: Overview; base: string }) {
  const { courses: c, questions: q, exams: e, students: s, results: r } = d.flow;
  const stages = [
    <Stage
      key="courses"
      n={1}
      id="courses"
      title="Courses"
      icon="tree"
      tone="lav"
      big={c.courses}
      bigLabel="courses"
      lines={[
        `${plural(c.subjects, 'subject')} · ${plural(c.topics, 'topic')}`,
        `${plural(c.subjectsWithoutTopics, 'subject')} without topics`,
      ]}
      status={
        c.subjectsWithoutTopics ? 'Add missing topics' : c.courses ? 'All set' : 'Add a course'
      }
      statusTone={c.subjectsWithoutTopics || !c.courses ? 'warn' : 'ok'}
      to={`${base}/courses`}
    />,
    <Stage
      key="questions"
      n={2}
      id="questions"
      title="Question Bank"
      icon="help"
      tone="peach"
      big={q.total}
      bigLabel="questions"
      lines={[
        `${q.published} published · ${q.draft} draft`,
        `${q.easy} easy · ${q.medium} medium · ${q.hard} hard`,
      ]}
      status={q.draft ? `${q.draft} drafts to review` : 'All published'}
      statusTone={q.draft ? 'warn' : 'ok'}
      to={`${base}/questions`}
    />,
    <Stage
      key="exams"
      n={3}
      id="exams"
      title="Exams"
      icon="file"
      tone="sky"
      big={e.open}
      bigLabel="open now"
      lines={[`${e.draft} draft · ${e.closed} closed`, `${e.attempts} attempts so far`]}
      status={e.draft ? `${e.draft} not published yet` : 'Nothing pending'}
      statusTone={e.draft ? 'warn' : 'ok'}
      to={`${base}/exams`}
    />,
    <Stage
      key="students"
      n={4}
      id="students"
      title="Batches & students"
      icon="users"
      tone="mint"
      big={s.students}
      bigLabel="students"
      lines={[
        `${plural(s.batches, 'batch', 'batches')} · ${plural(s.teachers, 'teacher')}`,
        `${s.notInvited} not invited · ${s.noBatch} without a batch`,
      ]}
      status={
        s.notInvited + s.noBatch ? `${s.notInvited + s.noBatch} need action` : 'Everyone can log in'
      }
      statusTone={s.notInvited + s.noBatch ? 'warn' : 'ok'}
      to={`${base}/students`}
    />,
    <Stage
      key="results"
      n={5}
      id="results"
      title="Results"
      icon="chart"
      tone="butter"
      big={r.passRate == null ? '—' : `${r.passRate}%`}
      bigLabel="pass rate"
      lines={[
        `${plural(r.results, 'result')} · avg ${pct(r.averagePercentage)}`,
        `${plural(r.belowPass, 'student')} below pass mark`,
      ]}
      status={
        r.belowPass
          ? `${r.belowPass} need support`
          : r.results
            ? 'Everyone passed'
            : 'No results yet'
      }
      statusTone={r.belowPass ? 'bad' : 'ok'}
      to={`${base}/results`}
    />,
  ];
  return (
    <section className={card} data-testid="dashboard-flow">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="font-display text-lg font-extrabold">From course to result</h2>
        <span className="text-[13px] text-muted">
          Each step of your flow — click one to open it
        </span>
      </div>
      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1 max-[720px]:flex-col">
        {stages.map((st, i) => (
          <div key={i} className="contents">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="shrink-0 self-center text-lg font-extrabold text-muted max-[720px]:rotate-90"
              >
                →
              </span>
            )}
            {st}
          </div>
        ))}
      </div>
    </section>
  );
}

function Bars({ d, rangeLabel }: { d: Overview; rangeLabel: string }) {
  const vals = d.perDay.map((p) => p.results);
  const mx = Math.max(...vals, 1);
  const peak = vals.indexOf(Math.max(...vals));
  return (
    <div className={cn(card, 'flex-[2_1_460px]')} data-testid="dashboard-results-chart">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="font-display text-lg font-extrabold">Exams submitted per day</h2>
        <span className={cn(pill, PILL.neutral)}>{rangeLabel}</span>
      </div>
      <div
        className="flex h-[190px] items-end gap-2"
        role="img"
        aria-label={`Exams submitted per day, ${rangeLabel}, peak ${Math.max(...vals, 0)}`}
      >
        {d.perDay.map((p, i) => (
          <div
            key={p.day}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
            data-testid="dashboard-results-chart-bar"
            data-value={p.results}
            title={`${fmtDate(p.day)}: ${p.results}`}
          >
            <span className="num text-[10px] text-muted">{p.results}</span>
            <i
              className={cn(
                'block w-full rounded-full',
                p.results && i === peak
                  ? 'bg-bar-peak'
                  : i === vals.length - 1
                    ? 'bg-primary'
                    : 'bg-bar',
              )}
              style={{ height: `${Math.max(4, (p.results / mx) * 86)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{fmtDate(d.perDay[0]?.day)}</span>
        <span>{fmtDate(d.perDay.at(-1)?.day)}</span>
      </div>
    </div>
  );
}

function Attention({ d, base }: { d: Overview; base: string }) {
  const rows: Array<{ tone: Tone | 'danger'; icon: IconName; body: ReactNode }> = [];
  for (const x of d.exams.filter((e) => e.state === 'draft')) {
    const miss = [
      !x.questionCount && 'no questions',
      !x.assignmentCount && 'not assigned',
      !(x.startAt && x.endAt) && 'no exam window',
    ].filter(Boolean);
    if (miss.length)
      rows.push({
        tone: 'butter',
        icon: 'file',
        body: (
          <>
            <Link to={`${base}/exams/${x.id}`}>{x.name}</Link> is a draft with {miss.join(', ')}
          </>
        ),
      });
  }
  const s = d.flow.students;
  if (s.notInvited)
    rows.push({
      tone: 'sky',
      icon: 'mail',
      body: (
        <>
          {plural(s.notInvited, 'student has', 'students have')} not been invited.{' '}
          <Link to={`${base}/students`}>Invite</Link>
        </>
      ),
    });
  if (s.noBatch)
    rows.push({
      tone: 'pink',
      icon: 'users',
      body: (
        <>
          {plural(s.noBatch, 'student has', 'students have')} no batch and won't receive exams.{' '}
          <Link to={`${base}/students`}>Fix</Link>
        </>
      ),
    });
  if (d.flow.results.belowPass)
    rows.push({
      tone: 'danger',
      icon: 'chart',
      body: (
        <>
          {plural(d.flow.results.belowPass, 'student')} scored below the pass mark.{' '}
          <Link to={`${base}/results`}>See who</Link>
        </>
      ),
    });
  return (
    <div className={cn(card, 'flex-[1_1_300px]')} data-testid="dashboard-attention">
      <h2 className="font-display text-lg font-extrabold">Needs your attention</h2>
      {rows.length ? (
        rows.map((r, i) => (
          <div key={i} className={row} data-testid="dashboard-attention-row">
            <span
              className={cn(
                'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl',
                r.tone === 'danger' ? 'bg-danger-bg text-danger' : SQ[r.tone],
              )}
            >
              <Icon name={r.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1">{r.body}</span>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center gap-2 py-7 text-center text-muted">
          <b className="text-ink">All clear</b>Nothing needs your attention.
        </div>
      )}
    </div>
  );
}

function Today({ d, base }: { d: Overview; base: string }) {
  // Read the clock once per mount: rendering stays pure.
  const [now] = useState(() => Date.now());
  const day = 86_400_000;
  const opening = d.exams.filter(
    (e) =>
      e.state === 'published' &&
      e.startAt &&
      +new Date(e.startAt) > now &&
      +new Date(e.startAt) - now < 2 * day,
  );
  const closing = d.exams
    .filter((e) => e.state === 'published' && e.endAt && +new Date(e.endAt) > now)
    .sort((a, b) => +new Date(a.endAt!) - +new Date(b.endAt!))
    .slice(0, 2);
  const when = (iso: string) => {
    const dt = new Date(iso);
    const t = new Date();
    const tomorrow = new Date(t.getTime() + day);
    if (dt.toDateString() === t.toDateString()) return fmtTime(iso);
    if (dt.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return fmtDate(iso).slice(0, 5);
  };
  return (
    <div className={cn(card, 'flex-[1_1_300px]')} data-testid="dashboard-today">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="font-display text-lg font-extrabold">Today</h2>
        <span className="text-[13px] text-muted">{fmtDate(new Date())}</span>
      </div>
      {opening.map((x) => (
        <div
          key={`o-${x.id}`}
          className={row}
          data-testid="dashboard-today-row"
          data-entity-id={x.id}
        >
          <span className="num min-w-16 font-extrabold">{when(x.startAt!)}</span>
          <span className="min-w-0 flex-1">
            <Link to={`${base}/exams/${x.id}`} className="font-bold text-ink">
              {x.name} opens
            </Link>
            <span className="block text-xs text-muted">
              {x.students} students · {x.durationMinutes} min
            </span>
          </span>
        </div>
      ))}
      {closing.map((x) => (
        <div
          key={`c-${x.id}`}
          className={row}
          data-testid="dashboard-today-row"
          data-entity-id={x.id}
        >
          <span className="num min-w-16 font-extrabold">{when(x.endAt!)}</span>
          <span className="min-w-0 flex-1">
            <b>{x.name} closes</b>
            <span className="block text-xs text-muted">
              {x.attempts} of {x.students} students have attempted
            </span>
          </span>
          <span className={cn(pill, PILL.warn)}>{Math.max(0, x.students - x.attempts)} left</span>
        </div>
      ))}
      {!opening.length && !closing.length && (
        <div className="flex flex-col items-center gap-2 py-7 text-center text-muted">
          <b className="text-ink">Nothing scheduled</b>Exams opening or closing soon show here.
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const base = useAreaBase();
  const perms = usePermissions();
  const user = useShellUser();
  const [params, setParams] = useSearchParams();
  const filter: OverviewFilter = {
    range: (RANGES.some((r) => r.value === params.get('range'))
      ? params.get('range')
      : '30') as OverviewRange,
    ...(params.get('batch') ? { batch: params.get('batch')! } : {}),
    ...(params.get('course') ? { course: params.get('course')! } : {}),
    ...(params.get('exam') ? { exam: params.get('exam')! } : {}),
  };
  const q = useOverview(filter);
  const units = useUnitTree();
  const catalog = useCatalogTree();
  const examList = useExams({ page: 1, pageSize: 100 });
  const batchOptions = useMemo(() => unitOptions(units.data?.units ?? []), [units.data]);
  const setFilter = (k: keyof OverviewFilter, v: string) => {
    const next = new URLSearchParams(params);
    if (v && !(k === 'range' && v === '30')) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const active = filter.range !== '30' || filter.batch || filter.course || filter.exam;
  const rangeLabel = RANGES.find((r) => r.value === filter.range)!.label;
  const d = q.data;
  const h = d?.headline;
  const first = (user?.name ?? '').split(' ')[0];

  return (
    <PageRoot testId="page-dashboard" ready={!q.isPending} className="flex flex-col gap-[18px]">
      <PageHeader
        breadcrumb={[{ label: 'Overview' }]}
        title={first ? `Hi, ${first}` : 'Dashboard'}
        description={`Your ${perms.isOrgAdmin ? 'organization' : 'batches'} at a glance · ${fmtDate(new Date())}`}
        actions={
          <>
            <Button
              variant="ghost"
              leftIcon={<Icon name="download" size={16} />}
              onClick={() => window.print()}
              data-testid="dashboard-download-pdf-btn"
            >
              Download PDF
            </Button>
            {perms.can('exam.create') && (
              <Link
                to={`${base}/exams/new`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-[18px] font-bold text-on-primary hover:no-underline"
                data-testid="dashboard-create-exam-btn"
              >
                <Icon name="plus" size={16} />
                Create exam
              </Link>
            )}
          </>
        }
      />
      <section
        className="rounded-card bg-surface px-[18px] py-4"
        data-testid="dashboard-filters"
        aria-label="Dashboard filters"
      >
        <div className="flex flex-wrap items-end gap-2.5 [&>*]:flex-[1_1_150px]">
          <Select
            label="Date range"
            value={filter.range}
            options={RANGES}
            onChange={(e) => setFilter('range', e.target.value)}
            data-testid="dashboard-filter-date-range-select"
          />
          <Select
            label="Batch"
            value={filter.batch ?? ''}
            placeholder="All batches"
            options={batchOptions}
            onChange={(e) => setFilter('batch', e.target.value)}
            data-testid="dashboard-filter-batch-select"
          />
          <Select
            label="Course"
            value={filter.course ?? ''}
            placeholder="All courses"
            options={(catalog.data?.courses ?? []).map((c) => ({ value: c.id, label: c.name }))}
            onChange={(e) => setFilter('course', e.target.value)}
            data-testid="dashboard-filter-course-select"
          />
          <Select
            label="Exam"
            value={filter.exam ?? ''}
            placeholder="All exams"
            options={(examList.data?.items ?? []).map((x) => ({ value: x.id, label: x.name }))}
            onChange={(e) => setFilter('exam', e.target.value)}
            data-testid="dashboard-filter-exam-select"
          />
          <div className="!flex-none">
            <Button
              variant="secondary"
              size="sm"
              disabled={!active}
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              data-testid="dashboard-filter-reset-btn"
            >
              Reset filters
            </Button>
          </div>
        </div>
      </section>

      {q.isError ? (
        <div
          className={cn(card, 'items-center text-center text-muted')}
          data-testid="dashboard-error"
        >
          <b className="text-ink">Could not load the dashboard</b>
          {errorText(q.error)}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void q.refetch()}
            data-testid="dashboard-retry-btn"
          >
            Try again
          </Button>
        </div>
      ) : !d || !h ? (
        <p className="py-10 text-center text-muted" data-testid="dashboard-loading">
          Loading your dashboard…
        </p>
      ) : (
        <div
          className={cn(
            'flex flex-col gap-[18px] transition-opacity',
            q.isFetching && 'opacity-70',
          )}
        >
          <section
            className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]"
            data-testid="dashboard-headline"
          >
            <Tile
              tone="lav"
              testId="students"
              label="Students"
              value={fmtNumber(h.students)}
              chip={plural(h.batches, 'batch', 'batches')}
            />
            <Tile
              tone="sky"
              testId="exams-open"
              label="Exams open now"
              value={h.examsOpen}
              chip={`${h.examsDraft} in draft`}
            />
            <Tile
              tone="hero"
              testId="results"
              label={`Results · ${rangeLabel}`}
              value={fmtNumber(h.results)}
              chip={`${h.attempts} attempts in total`}
            />
            <Tile
              tone="butter"
              testId="avg-score"
              label="Average score"
              value={pct(h.averagePercentage)}
              chip={`across ${plural(h.results, 'result')}`}
            />
            <Tile
              tone="mint"
              testId="pass-rate"
              label="Pass rate"
              value={h.passRate == null ? '—' : `${h.passRate}%`}
              chip={`${h.passed} of ${h.results} passed`}
            />
            <Tile
              tone="pink"
              testId="live-today"
              label="Live classes today"
              value={h.liveToday ?? '—'}
              chip={h.liveToday == null ? 'Live classes not set up yet' : undefined}
            />
          </section>

          <Flow d={d} base={base} />

          <section className="flex flex-wrap gap-4">
            <Bars d={d} rangeLabel={rangeLabel} />
            <Attention d={d} base={base} />
          </section>

          <section className="flex flex-wrap gap-4">
            <div className={cn(card, 'flex-[2_1_520px]')} data-testid="dashboard-exams">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="font-display text-lg font-extrabold">Exams</h2>
                <Link to={`${base}/exams`} data-testid="dashboard-all-exams-link">
                  All exams
                </Link>
              </div>
              {d.exams.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-separate [border-spacing:0_6px]">
                    <thead>
                      <tr className="text-left text-xs font-bold text-muted">
                        {['Exam', 'Status', 'Window', 'Students', 'Attempts', 'Avg'].map((t) => (
                          <th key={t} className="px-3 py-1.5 font-bold">
                            {t}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.exams.map((x) => (
                        <tr
                          key={x.id}
                          data-testid="dashboard-exam-row"
                          data-entity-id={x.id}
                          data-entity-code={x.code}
                          data-state={x.state}
                          className="[&>td]:bg-row [&>td]:px-3 [&>td]:py-[11px] [&>td:first-child]:rounded-l-[14px] [&>td:last-child]:rounded-r-[14px]"
                        >
                          <td>
                            <Link to={`${base}/exams/${x.id}`} className="font-bold">
                              {x.name}
                            </Link>
                            <span className="block text-xs text-muted">
                              {x.courseName ?? 'No course'} · {plural(x.questionCount, 'question')}
                            </span>
                          </td>
                          <td>
                            <StatusPill state={x.state} />
                          </td>
                          <td className="num">
                            {x.startAt || x.endAt ? (
                              `${fmtDate(x.startAt)} → ${fmtDate(x.endAt)}`
                            ) : (
                              <span className="text-xs text-muted">Not set</span>
                            )}
                          </td>
                          <td className="num">{x.students}</td>
                          <td className="num">{x.attempts}</td>
                          <td className="num">
                            {x.averagePercentage == null
                              ? '—'
                              : `${Math.round(x.averagePercentage)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center gap-2 py-7 text-center text-muted"
                  data-testid="dashboard-exams-empty"
                >
                  <b className="text-ink">No exams yet</b>Use “Create exam” to start one.
                </div>
              )}
            </div>
            <Today d={d} base={base} />
          </section>

          <section className="flex flex-wrap gap-4">
            <div className={cn(card, 'flex-[1_1_300px]')} data-testid="dashboard-teachers">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="font-display text-lg font-extrabold">Teachers</h2>
                <Link to={`${base}/teachers`} data-testid="dashboard-all-teachers-link">
                  All
                </Link>
              </div>
              {d.teachers.length ? (
                d.teachers.map((t) => (
                  <div
                    key={t.id}
                    className={row}
                    data-testid="dashboard-teacher-row"
                    data-entity-id={t.id}
                  >
                    <span
                      className={cn(
                        'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl text-[13px] font-extrabold',
                        SQ.mint,
                      )}
                    >
                      {t.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{t.name}</b>
                      <span className="block truncate text-xs text-muted">{t.email ?? '—'}</span>
                    </span>
                    <span
                      className={cn(pill, t.hasLogin ? PILL.ok : PILL.neutral)}
                      data-status={t.hasLogin ? 'active' : 'not-invited'}
                    >
                      {t.hasLogin ? 'Active' : 'Not invited'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted">No teachers yet.</p>
              )}
            </div>
            <div className={cn(card, 'flex-[1_1_300px]')} data-testid="dashboard-top">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="font-display text-lg font-extrabold">Top students</h2>
                <Link to={`${base}/leaderboard`} data-testid="dashboard-leaderboard-link">
                  Leaderboard
                </Link>
              </div>
              {d.topStudents.length ? (
                d.topStudents.map((r, i) => (
                  <div
                    key={r.id}
                    className={row}
                    data-testid="dashboard-top-row"
                    data-entity-id={r.id}
                  >
                    <span
                      className={cn(
                        'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl font-extrabold',
                        SQ[(['butter', 'lav', 'peach'] as const)[i]!],
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{r.studentName}</b>
                      <span className="block truncate text-xs text-muted">{r.examName}</span>
                    </span>
                    <b className="num">{Math.round(r.percentage)}%</b>
                  </div>
                ))
              ) : (
                <p className="text-muted">No results in this period.</p>
              )}
            </div>
          </section>

          <section className={card} data-testid="dashboard-recent-results">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 className="font-display text-lg font-extrabold">Latest results</h2>
              <Link to={`${base}/results`} data-testid="dashboard-all-results-link">
                All results
              </Link>
            </div>
            {d.recentResults.length ? (
              d.recentResults.map((r) => {
                const passed = r.status === 'Passed';
                return (
                  <div key={r.id} className={row} data-testid="result-row" data-entity-id={r.id}>
                    <span
                      className={cn(
                        'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl text-[13px] font-extrabold',
                        SQ.lav,
                      )}
                    >
                      {r.studentName
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b>{r.studentName}</b>
                      <span className="block text-xs text-muted">
                        {r.examName} · {fmtDate(r.evaluatedAt)} {fmtTime(r.evaluatedAt)}
                      </span>
                    </span>
                    <b className="num text-lg">{Math.round(r.percentage)}%</b>
                    <span
                      className={cn(pill, passed ? PILL.ok : PILL.bad)}
                      data-state={passed ? 'passed' : 'failed'}
                    >
                      {passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center gap-2 py-7 text-center text-muted">
                <b className="text-ink">No results for these filters</b>
              </div>
            )}
          </section>
        </div>
      )}
    </PageRoot>
  );
}
