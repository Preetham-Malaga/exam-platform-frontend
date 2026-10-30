// PURPOSE: /org/questions and /teacher/questions - the prototype's Question Bank (vQBDrill): course cards with counts and
//          a difficulty bar → inside a course, subject tabs, difficulty chips and question cards with their actions.
// WHY: Owners and teachers start from the course they teach. Add, edit and import open their own pages; delete is
//      confirmed in place. Counts come from GET /catalog/tree (one call); questions from GET /questions?courseId=….
// DEPENDS ON: features/academic/hooks.ts, features/assessment/hooks.ts, services/assessmentService.ts.

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { InlineConfirm } from '@/components/inline/Inline';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { useCatalogTree } from '@/features/academic/hooks';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { useAssessmentMutation, useQuestion, useQuestions } from '@/features/assessment/hooks';
import { questionService } from '@/services/assessmentService';
import type { Difficulty, QuestionSummary } from '@/types/assessment';
import { cn } from '@/utils/cn';

const TONES = ['lav', 'mint', 'peach', 'sky', 'butter', 'pink'] as const;
const COVER: Record<(typeof TONES)[number], string> = {
  lav: 'bg-lav text-lav-ink',
  mint: 'bg-mint text-mint-ink',
  peach: 'bg-peach text-peach-ink',
  sky: 'bg-sky text-sky-ink',
  butter: 'bg-butter text-butter-ink',
  pink: 'bg-pink text-pink-ink',
};
const pill =
  'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold';
const DIFF_PILL: Record<Difficulty, string> = {
  easy: 'bg-mint text-mint-ink',
  medium: 'bg-butter text-butter-ink',
  hard: 'bg-danger-bg text-danger',
};
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const LET = 'ABCDEF';
const btnLink =
  'inline-flex min-h-[44px] items-center gap-2 rounded-full px-[18px] font-bold hover:no-underline';

/** Options of one question, loaded when the card asks for them (the answer key is never in the list). */
function Options({ id }: { id: string }) {
  const q = useQuestion(id);
  if (q.isPending) return <p className="text-xs text-muted">Loading options…</p>;
  if (!q.data) return null;
  return (
    <div className="flex flex-col gap-1.5" data-testid="question-options">
      {q.data.options.map((o, i) => {
        const correct = o.id === q.data.correctOptionId;
        return (
          <div
            key={o.id}
            className={cn(
              'flex items-center gap-3 rounded-row px-3 py-2.5 font-semibold',
              correct ? 'bg-mint' : 'bg-row',
            )}
            data-testid="question-option"
            data-selected={correct}
          >
            <span
              className={cn(
                'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] font-extrabold',
                correct ? 'bg-mint-ink text-mint' : 'bg-surface',
              )}
            >
              {LET[i]}
            </span>
            <span className="flex-1">{o.text}</span>
            {correct && <span className={cn(pill, 'bg-surface text-mint-ink')}>Correct</span>}
          </div>
        );
      })}
    </div>
  );
}

function QuestionCard({ q, n, base }: { q: QuestionSummary; n: number; base: string }) {
  const perms = usePermissions();
  const { toast } = useToast();
  const [showOptions, setShowOptions] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const publish = useAssessmentMutation((id: string) => questionService.publish(id));
  const toDraft = useAssessmentMutation((id: string) => questionService.setStatus(id, 'draft'));
  const remove = useAssessmentMutation((id: string) => questionService.remove(id));
  const fail = (t: string) => (e: unknown) =>
    toast({ title: t, description: errorText(e), variant: 'error' });
  return (
    <article
      className="flex flex-col gap-3.5 rounded-card bg-surface p-[22px]"
      data-testid="questions-card"
      data-entity-id={q.id}
      data-state={q.status}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="eyebrow">
          Q{n} · {q.subjectName} › {q.topicName ?? 'No topic'}
        </span>
        <div className="flex flex-wrap gap-2">
          <span className={cn(pill, DIFF_PILL[q.difficulty])} data-state={q.difficulty}>
            {cap(q.difficulty)}
          </span>
          <span
            className={cn(
              pill,
              q.status === 'published' ? 'bg-mint text-mint-ink' : 'bg-bg text-ink',
            )}
            data-state={q.status}
          >
            {cap(q.status)}
          </span>
          <span className={cn(pill, 'bg-bg text-ink')}>
            +{q.marks} / −{q.negativeMarks}
          </span>
        </div>
      </div>
      <h2 className="font-display text-[19px] font-medium leading-[1.4]">{q.questionText}</h2>
      {showOptions && <Options id={q.id} />}
      {confirm ? (
        <InlineConfirm
          open
          testId="questions-delete"
          title="Delete this question?"
          message={q.examCount ? `It is used in ${q.examCount} exam(s).` : 'This cannot be undone.'}
          confirmLabel="Delete"
          loading={remove.isPending}
          onCancel={() => setConfirm(false)}
          onConfirm={() =>
            remove.mutate(q.id, {
              onSuccess: () => toast({ title: 'Question deleted', variant: 'success' }),
              onError: (e) => {
                setConfirm(false);
                fail('Could not delete the question')(e);
              },
            })
          }
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={showOptions}
            onClick={() => setShowOptions((v) => !v)}
            data-testid="questions-card-options-btn"
          >
            {showOptions ? 'Hide answer' : 'Show answer'}
          </Button>
          {perms.can('question.update') && (
            <Link
              to={`${base}/questions/${q.id}/edit`}
              className={cn(btnLink, 'min-h-9 bg-lav px-3.5 text-[13px] text-lav-ink')}
              data-testid="questions-card-edit-btn"
            >
              <Icon name="edit" size={14} />
              Edit
            </Link>
          )}
          {perms.can('question.publish') &&
            (q.status === 'published' ? (
              <Button
                size="sm"
                variant="ghost"
                loading={toDraft.isPending}
                onClick={() =>
                  toDraft.mutate(q.id, {
                    onSuccess: () => toast({ title: 'Moved to draft', variant: 'success' }),
                    onError: fail('Could not move it to draft'),
                  })
                }
                data-testid="questions-card-draft-btn"
              >
                Move to draft
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                loading={publish.isPending}
                onClick={() =>
                  publish.mutate(q.id, {
                    onSuccess: () => toast({ title: 'Question published', variant: 'success' }),
                    onError: fail('Could not publish the question'),
                  })
                }
                data-testid="questions-card-publish-btn"
              >
                Publish
              </Button>
            ))}
          {perms.can('question.delete') && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Icon name="trash" size={14} />}
              onClick={() => setConfirm(true)}
              data-testid="questions-card-delete-btn"
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export default function QuestionBankPage() {
  const base = useAreaBase();
  const perms = usePermissions();
  const tree = useCatalogTree();
  const [params, setParams] = useSearchParams();
  const courseId = params.get('course') ?? '';
  const subjectId = params.get('subject') ?? '';
  const difficulty = (params.get('difficulty') ?? '') as Difficulty | '';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === 'course') {
      next.delete('subject');
      next.delete('difficulty');
    }
    setParams(next);
  };
  const course = tree.data?.courses.find((c) => c.id === courseId);
  const subjects = (tree.data?.subjects ?? []).filter((s) => s.courseId === courseId);
  const questions = useQuestions(
    {
      page: 1,
      pageSize: 100,
      courseId,
      ...(subjectId ? { subjectId } : {}),
      ...(difficulty ? { difficulty } : {}),
      sort: 'createdAt',
      order: 'desc',
    },
    Boolean(course),
  );

  const actions = (
    <>
      {perms.can('question.create') && (
        <Link
          to={`${base}/questions/import${courseId ? `?course=${courseId}` : ''}`}
          className={cn(btnLink, 'bg-bg text-ink')}
          data-testid="questions-import-btn"
        >
          <Icon name="file" size={16} />
          Import CSV
        </Link>
      )}
      {perms.can('question.create') && (
        <Link
          to={`${base}/questions/new${subjectId || subjects[0] ? `?subject=${subjectId || subjects[0]!.id}` : ''}`}
          className={cn(btnLink, 'bg-primary text-on-primary')}
          data-testid="questions-new-btn"
        >
          <Icon name="plus" size={16} />
          New question
        </Link>
      )}
    </>
  );

  if (!course) {
    const statsOf = (cid: string) => {
      const ss = (tree.data?.subjects ?? []).filter((s) => s.courseId === cid);
      const sum = (k: 'published' | 'draft' | 'easy' | 'medium' | 'hard') =>
        ss.reduce((a, s) => a + (s.questionStats?.[k] ?? 0), 0);
      return {
        subjects: ss.length,
        total: ss.reduce((a, s) => a + s.questionCount, 0),
        published: sum('published'),
        draft: sum('draft'),
        easy: sum('easy'),
        medium: sum('medium'),
        hard: sum('hard'),
      };
    };
    return (
      <PageRoot
        testId="page-questions"
        ready={!tree.isPending}
        className="flex flex-col gap-[18px]"
      >
        <PageHeader
          breadcrumb={[{ label: 'Question Bank' }]}
          title="Question Bank"
          description="Start with a course. Each card shows how many questions it has and how hard they are."
          actions={actions}
        />
        {tree.isError ? (
          <p className="text-danger" data-testid="questions-error">
            {errorText(tree.error)}
          </p>
        ) : (
          <section
            className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]"
            data-testid="questions-course-cards"
          >
            {(tree.data?.courses ?? []).map((c, i) => {
              const st = statsOf(c.id);
              const w = (n: number) => (st.total ? `${(n / st.total) * 100}%` : '0%');
              const tone = TONES[i % TONES.length]!;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set('course', c.id)}
                  className="flex min-h-[220px] flex-col overflow-hidden rounded-card border border-border bg-surface text-left text-ink hover:border-accent"
                  data-testid="questions-course-card"
                  data-entity-id={c.id}
                  data-entity-code={c.code}
                >
                  <div
                    className={cn(
                      'flex min-h-[100px] w-full flex-col items-start justify-between gap-2.5 p-[18px]',
                      COVER[tone],
                    )}
                  >
                    <span className="rounded-lg bg-surface px-2 py-[3px] text-[11px] font-extrabold tracking-[.06em] text-ink">
                      {c.code}
                    </span>
                    <span className="font-display text-[28px] font-semibold">{c.name}</span>
                  </div>
                  <div className="flex w-full flex-col gap-2 px-4 py-3.5">
                    <b className="num text-2xl">{st.total} questions</b>
                    <span className="text-xs font-semibold text-muted">
                      {st.published} published · {st.draft} draft · {st.subjects} subjects
                    </span>
                    <div
                      className="flex h-2 overflow-hidden rounded-full bg-row"
                      role="img"
                      aria-label={`${st.easy} easy, ${st.medium} medium, ${st.hard} hard`}
                    >
                      <i className="block bg-mint-ink" style={{ width: w(st.easy) }} />
                      <i className="block bg-butter-ink" style={{ width: w(st.medium) }} />
                      <i className="block bg-danger" style={{ width: w(st.hard) }} />
                    </div>
                    <span className="text-xs font-semibold text-muted">
                      {st.easy} easy · {st.medium} medium · {st.hard} hard
                    </span>
                  </div>
                </button>
              );
            })}
            {perms.can('question.create') && (
              <Link
                to={`${base}/questions/new`}
                className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-dash bg-surface-2 p-5 text-center text-accent hover:no-underline"
                data-testid="questions-new-card"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-[14px] bg-lav text-2xl text-lav-ink"
                  aria-hidden="true"
                >
                  +
                </span>
                <b>New question</b>
                <span className="text-xs font-semibold text-muted">
                  Opens the full question form
                </span>
              </Link>
            )}
            {!tree.isPending && !tree.data?.courses.length && (
              <p className="text-muted" data-testid="questions-no-courses">
                Add a course and its subjects first, then questions.{' '}
                <Link to={`${base}/courses`}>Open Courses</Link>
              </p>
            )}
          </section>
        )}
      </PageRoot>
    );
  }

  const all = subjects.reduce((a, s) => a + s.questionCount, 0);
  const list = questions.data?.items ?? [];
  return (
    <PageRoot
      testId="page-questions"
      ready={!questions.isPending}
      className="flex flex-col gap-[18px]"
    >
      <PageHeader
        breadcrumb={[{ label: 'Question Bank', to: `${base}/questions` }, { label: course.name }]}
        title={`${course.name} questions`}
        description={`${all} questions · ${subjects.reduce((a, s) => a + (s.questionStats?.published ?? 0), 0)} published`}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => set('course', '')}
              data-testid="questions-all-courses-btn"
            >
              All courses
            </Button>
            {actions}
          </>
        }
      />
      <div
        role="tablist"
        aria-label="Subject"
        className="flex max-w-full flex-wrap gap-1.5 self-start rounded-full bg-surface p-[5px]"
      >
        {[
          { id: '', name: 'All subjects', n: all },
          ...subjects.map((s) => ({ id: s.id, name: s.name, n: s.questionCount })),
        ].map((t) => (
          <button
            key={t.id || 'all'}
            type="button"
            role="tab"
            aria-selected={subjectId === t.id}
            onClick={() => set('subject', t.id)}
            className={cn(
              'min-h-[38px] rounded-full px-4 font-bold',
              subjectId === t.id ? 'bg-primary text-on-primary' : 'text-muted',
            )}
            data-testid="questions-subject-tab"
            data-value={t.id || 'all'}
          >
            {t.name}
            <span className="num ml-1 opacity-75">{t.n}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by difficulty">
        {(['easy', 'medium', 'hard'] as const).map((dv) => (
          <button
            key={dv}
            type="button"
            aria-pressed={difficulty === dv}
            onClick={() => set('difficulty', difficulty === dv ? '' : dv)}
            className={cn(
              'min-h-9 rounded-full border-[1.5px] px-3.5 font-bold',
              difficulty === dv
                ? 'border-transparent bg-primary text-on-primary'
                : 'border-border bg-surface text-ink',
            )}
            data-testid="questions-filter-diff-chip"
            data-value={dv}
          >
            {cap(dv)}
          </button>
        ))}
      </div>
      <section className="flex flex-col gap-3" data-testid="questions-card-list">
        {questions.isError ? (
          <p className="text-danger">{errorText(questions.error)}</p>
        ) : questions.isPending ? (
          <p className="text-muted">Loading questions…</p>
        ) : list.length ? (
          list.map((q, i) => <QuestionCard key={q.id} q={q} n={i + 1} base={base} />)
        ) : (
          <div
            className="flex flex-col items-center gap-2 rounded-card bg-surface py-7 text-center text-muted"
            data-testid="questions-empty"
          >
            <b className="text-ink">No questions here yet</b>
            {perms.can('question.create') && (
              <Link to={`${base}/questions/new`}>Add the first one</Link>
            )}
          </div>
        )}
      </section>
    </PageRoot>
  );
}
