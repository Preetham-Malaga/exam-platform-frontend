// PURPOSE: /org/exams and /teacher/exams - the prototype's Exams list (vExams): Draft / Published / Closed tabs with
//          counts, one row per exam (course, questions and marks, duration, window, attempts, status) and its actions:
//          Edit and Delete for drafts; View, Unpublish to edit (no attempts yet) or Locked, and Duplicate otherwise.
//          Also exports NewExamForm, shown on its own page (/org/exams/new).
// WHY: The tab follows the exam's state on the server (GET /exams?state=…), so a published exam whose window ended shows
//      under Closed. Deletes and unpublishing are confirmed in place; nothing is a pop-up.
// DEPENDS ON: features/assessment/ExamForm.tsx + hooks.ts, services/assessmentService.ts, utils/dates.ts.

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { InlineConfirm, InlinePanel } from '@/components/inline/Inline';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { ExamForm } from '@/features/assessment/ExamForm';
import { useAssessmentMutation, useExams } from '@/features/assessment/hooks';
import { examService } from '@/services/assessmentService';
import type { ExamBody, ExamState, ExamSummary } from '@/types/assessment';
import { cn } from '@/utils/cn';
import { fmtDate } from '@/utils/dates';

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
            Create and add questions
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
                title: `Draft ${exam.name} created`,
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

const TABS: Array<{ value: ExamState; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
];
const STATE_PILL: Record<ExamState, [string, string]> = {
  draft: ['Draft', 'bg-butter text-butter-ink'],
  published: ['Published', 'bg-mint text-mint-ink'],
  closed: ['Closed', 'bg-bg text-ink'],
};
const pill =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold';
const smallLink =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold hover:no-underline';

function Row({ x, base }: { x: ExamSummary; base: string }) {
  const perms = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<'delete' | 'unpublish' | null>(null);
  const remove = useAssessmentMutation((id: string) => examService.remove(id));
  const unpublish = useAssessmentMutation((id: string) => examService.unpublish(id));
  const duplicate = useAssessmentMutation((id: string) => examService.duplicate(id));
  const state = x.state ?? (x.status === 'published' ? 'published' : 'draft');
  const fail = (t: string) => (e: unknown) =>
    toast({ title: t, description: errorText(e), variant: 'error' });

  if (confirm)
    return (
      <tr>
        <td colSpan={8} className="!p-0">
          <InlineConfirm
            open
            testId={confirm === 'delete' ? 'exams-delete' : 'exams-unpublish'}
            tone={confirm === 'delete' ? 'danger' : 'primary'}
            title={confirm === 'delete' ? `Delete draft ${x.name}?` : `Unpublish ${x.name}?`}
            message={
              confirm === 'delete'
                ? 'Its questions stay in the bank.'
                : 'Students no longer see it until you publish it again. You can then edit it.'
            }
            confirmLabel={confirm === 'delete' ? 'Delete' : 'Unpublish'}
            loading={remove.isPending || unpublish.isPending}
            onCancel={() => setConfirm(null)}
            onConfirm={() =>
              confirm === 'delete'
                ? remove.mutate(x.id, {
                    onSuccess: () => toast({ title: `${x.name} deleted`, variant: 'success' }),
                    onError: (e) => {
                      setConfirm(null);
                      fail('Could not delete the exam')(e);
                    },
                  })
                : unpublish.mutate(x.id, {
                    onSuccess: () => {
                      setConfirm(null);
                      toast({ title: 'Unpublished — you can edit it now', variant: 'success' });
                    },
                    onError: (e) => {
                      setConfirm(null);
                      fail('Could not unpublish')(e);
                    },
                  })
            }
          />
        </td>
      </tr>
    );
  return (
    <tr
      data-testid="exam-row"
      data-entity-id={x.id}
      data-entity-code={x.examCode}
      data-state={state}
      className="[&>td]:bg-row [&>td]:px-3 [&>td]:py-[11px] [&>td]:align-middle [&>td:first-child]:rounded-l-[14px] [&>td:last-child]:rounded-r-[14px]"
    >
      <td>
        <Link
          to={`${base}/exams/${x.id}`}
          className="font-bold text-ink"
          data-testid="exam-row-open-btn"
        >
          {x.name}
        </Link>
        <span className="block text-xs text-muted">{x.examCode}</span>
      </td>
      <td>{x.courseName ?? '—'}</td>
      <td className="num">
        {x.questionCount} {x.questionCount === 1 ? 'question' : 'questions'} · {x.totalMarks} marks
      </td>
      <td className="num">{x.durationMinutes} min</td>
      <td className="num">
        {x.startAt || x.endAt ? `${fmtDate(x.startAt)} → ${fmtDate(x.endAt)}` : 'Not set'}
      </td>
      <td className="num">{x.attemptCount}</td>
      <td>
        <span className={cn(pill, STATE_PILL[state][1])} data-state={state}>
          {STATE_PILL[state][0]}
        </span>
      </td>
      <td>
        <div className="flex flex-wrap justify-end gap-1.5">
          {state === 'draft' ? (
            <>
              <Link
                to={`${base}/exams/${x.id}`}
                className={cn(smallLink, 'bg-lav text-lav-ink')}
                data-testid="exam-row-edit-btn"
              >
                <Icon name="edit" size={14} />
                Edit
              </Link>
              {perms.can('exam.delete') && x.attemptCount === 0 && (
                <button
                  type="button"
                  className="inline-grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink"
                  aria-label={`Delete ${x.name}`}
                  onClick={() => setConfirm('delete')}
                  data-testid="exam-row-delete-btn"
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
            </>
          ) : (
            <>
              <Link
                to={`${base}/exams/${x.id}`}
                className={cn(smallLink, 'bg-bg text-ink')}
                data-testid="exam-row-view-btn"
              >
                View
              </Link>
              {x.attemptCount === 0 && state === 'published' && perms.can('exam.unpublish') ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirm('unpublish')}
                  data-testid="exam-row-unpublish-btn"
                >
                  Unpublish to edit
                </Button>
              ) : (
                <span
                  className={cn(pill, 'bg-bg text-ink')}
                  title="Students have attempted this exam"
                  data-testid="exam-row-locked-badge"
                >
                  <Icon name="lock" size={12} />
                  Locked
                </span>
              )}
            </>
          )}
          {perms.can('exam.create') && state !== 'draft' && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Icon name="copy" size={14} />}
              loading={duplicate.isPending}
              onClick={() =>
                duplicate.mutate(x.id, {
                  onSuccess: (n) => {
                    toast({ title: 'Duplicated as a new draft', variant: 'success' });
                    navigate(`${base}/exams/${n.id}`);
                  },
                  onError: fail('Could not duplicate'),
                })
              }
              data-testid="exam-row-duplicate-btn"
            >
              Duplicate
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ExamsPage() {
  const base = useAreaBase();
  const perms = usePermissions();
  const [params, setParams] = useSearchParams();
  const tab = (
    TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'draft'
  ) as ExamState;
  const [search, setSearch] = useState('');
  const q = useExams({
    page: 1,
    pageSize: 100,
    state: tab,
    sort: 'createdAt',
    order: 'desc',
    ...(search ? { search } : {}),
  });
  const counts = (q.data as { counts?: Record<ExamState, number> } | undefined)?.counts;
  const list = q.data?.items ?? [];

  return (
    <PageRoot testId="page-exams" ready={!q.isPending} className="flex flex-col gap-[18px]">
      <PageHeader
        breadcrumb={[{ label: 'Exams' }]}
        title="Exams"
        description="Create an exam, add published questions, assign it to batches, then publish."
        actions={
          perms.can('exam.create') && (
            <Link
              to={`${base}/exams/new`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-[18px] font-bold text-on-primary hover:no-underline"
              data-testid="exams-add-btn"
            >
              <Icon name="plus" size={16} />
              New exam
            </Link>
          )
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Exam status"
          className="flex max-w-full flex-wrap gap-1.5 rounded-full bg-surface p-[5px]"
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setParams(t.value === 'draft' ? {} : { tab: t.value })}
              className={cn(
                'min-h-[38px] rounded-full px-4 font-bold',
                tab === t.value ? 'bg-primary text-on-primary' : 'text-muted',
              )}
              data-testid={`exams-tab-${t.value}`}
            >
              {t.label}
              <span className="num ml-1 opacity-75" data-testid={`exams-tab-${t.value}-count`}>
                {counts?.[t.value] ?? ''}
              </span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or code"
          aria-label="Search exams"
          className="h-[42px] w-full max-w-xs rounded-input border-[1.5px] border-border bg-surface px-3.5"
          data-testid="exams-search-input"
        />
      </div>
      <section className="rounded-card bg-surface p-[22px]" data-testid="exams-list">
        {q.isError ? (
          <p className="text-danger" data-testid="exams-error">
            {errorText(q.error)}
          </p>
        ) : q.isPending ? (
          <p className="py-6 text-center text-muted">Loading exams…</p>
        ) : list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate [border-spacing:0_6px]">
              <thead>
                <tr className="text-left text-xs font-bold text-muted">
                  {['Exam', 'Course', 'Questions', 'Duration', 'Window', 'Attempts', 'Status'].map(
                    (h) => (
                      <th key={h} className="px-3 py-1.5">
                        {h}
                      </th>
                    ),
                  )}
                  <th className="px-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((x) => (
                  <Row key={x.id} x={x} base={base} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-2 py-7 text-center text-muted"
            data-testid="exams-empty"
          >
            <b className="text-ink">No {tab} exams</b>
            {tab === 'draft'
              ? 'Use “New exam” to start one.'
              : 'They appear here once their status changes.'}
          </div>
        )}
      </section>
    </PageRoot>
  );
}
