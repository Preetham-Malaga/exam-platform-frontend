// PURPOSE: /student/attempts/:attemptId - the exam screen: countdown to the SERVER deadline, one question at a time,
//          a question palette, flag for review, auto-save of every answer, submit (and auto-submit at the deadline).
// WHY: Guide Part 9.2. The browser clock is display only (corrected by the server time); answers are saved as soon as
//      they change so a dropped connection loses nothing; the paper never contains the answer key.
// DEPENDS ON: features/assessment/hooks.ts + format.ts, services/assessmentService.ts, shared UI.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { useToast } from '@/components/feedback/Toast';
import { InlineConfirm } from '@/components/inline/Inline';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { errorText } from '@/features/academic/ui';
import { clock } from '@/features/assessment/format';
import { assessmentKey, usePaper } from '@/features/assessment/hooks';
import { attemptService } from '@/services/assessmentService';
import type { Paper } from '@/types/assessment';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/utils/cn';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
interface Answer {
  optionId: string | null;
  flagged: boolean;
}

function Runner({ paper }: { paper: Paper }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const questions = paper.questions ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(
      (paper.answers ?? []).map((a) => [
        a.questionId,
        { optionId: a.selectedOptionId, flagged: a.flagged },
      ]),
    ),
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [unsaved, setUnsaved] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // server time - local time, so the countdown follows the server deadline even if the PC clock is wrong
  const [offset] = useState(() => new Date(paper.serverTime).getTime() - Date.now());
  const [now, setNow] = useState(() => Date.now());
  const submittedRef = useRef(false);
  const deadline = new Date(paper.deadlineAt).getTime();
  const remaining = deadline - (now + offset);

  const submit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        await attemptService.submit(paper.attemptId); // idempotent on the server
        await qc.invalidateQueries({ queryKey: assessmentKey });
        if (auto)
          toast({
            title: 'Time is up',
            description: 'Your answers were submitted.',
            variant: 'info',
          });
        navigate(`/student/results/${paper.attemptId}`, { replace: true });
      } catch (e) {
        submittedRef.current = false;
        setSubmitting(false);
        toast({ title: 'Could not submit', description: errorText(e), variant: 'error' });
      }
    },
    [navigate, paper.attemptId, qc, toast],
  );

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  // Auto-submit exactly at the server deadline (immediately if it has already passed).
  useEffect(() => {
    const t = window.setTimeout(
      () => void submit(true),
      Math.max(0, deadline - (Date.now() + offset)),
    );
    return () => window.clearTimeout(t);
  }, [deadline, offset, submit]);

  const save = async (questionId: string, a: Answer) => {
    setSaveState('saving');
    try {
      await attemptService.save(paper.attemptId, questionId, a.optionId, a.flagged);
      setUnsaved((s) => {
        const n = new Set(s);
        n.delete(questionId);
        return n;
      });
      setSaveState('saved');
    } catch {
      setUnsaved((s) => new Set(s).add(questionId));
      setSaveState('error');
    }
  };
  const update = (questionId: string, patch: Partial<Answer>) => {
    const next = { optionId: null, flagged: false, ...answers[questionId], ...patch };
    setAnswers((p) => ({ ...p, [questionId]: next }));
    void save(questionId, next);
  };
  const retry = () => {
    for (const qid of unsaved) void save(qid, answers[qid] ?? { optionId: null, flagged: false });
  };

  const q = questions[index];
  const answeredCount = questions.filter((x) => answers[x.id]?.optionId).length;
  const unanswered = questions.length - answeredCount;
  const low = remaining < 5 * 60_000;

  return (
    <div
      className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"
      data-testid="page-exam-runner"
      data-ready="true"
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-text">{paper.examName}</h1>
            <p className="text-sm text-muted">
              Question {index + 1} of {questions.length} · {answeredCount} answered
            </p>
          </div>
          <div
            role="timer"
            aria-label="Time remaining"
            data-testid="exam-runner-timer"
            data-remaining-seconds={Math.max(0, Math.floor(remaining / 1000))}
            className={cn(
              'rounded-lg px-4 py-2 font-mono text-xl font-bold',
              low ? 'bg-error/15 text-error' : 'bg-secondary/30 text-primary',
            )}
          >
            {clock(remaining)}
          </div>
        </div>
        {q && (
          <Card testId="exam-runner-question" entityId={q.id}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm text-muted">
                {q.marks} mark{q.marks === 1 ? '' : 's'}
                {q.negativeMarks ? ` · −${q.negativeMarks} for a wrong answer` : ''}
              </span>
              <Button
                size="sm"
                variant={answers[q.id]?.flagged ? 'secondary' : 'ghost'}
                aria-pressed={Boolean(answers[q.id]?.flagged)}
                onClick={() => update(q.id, { flagged: !answers[q.id]?.flagged })}
                data-testid="exam-runner-flag-btn"
              >
                {answers[q.id]?.flagged ? 'Flagged for review' : 'Flag for review'}
              </Button>
            </div>
            <p
              className="mb-4 whitespace-pre-wrap text-base font-medium text-text"
              id={`q-${q.id}`}
            >
              {q.text}
            </p>
            <div role="radiogroup" aria-labelledby={`q-${q.id}`} className="grid gap-2">
              {q.options.map((o, i) => {
                const selected = answers[q.id]?.optionId === o.id;
                return (
                  <label
                    key={o.id}
                    data-testid="exam-runner-option"
                    data-entity-id={o.id}
                    data-selected={selected}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                      selected
                        ? 'border-primary bg-secondary/25'
                        : 'border-border hover:bg-background',
                    )}
                  >
                    <input
                      type="radio"
                      name={`answer-${q.id}`}
                      className="h-4 w-4 accent-primary"
                      checked={selected}
                      onChange={() => update(q.id, { optionId: o.id })}
                      data-testid="exam-runner-option-radio"
                    />
                    <span className="font-semibold text-muted">{String.fromCharCode(65 + i)}.</span>
                    <span className="text-text">{o.text}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!answers[q.id]?.optionId}
                onClick={() => update(q.id, { optionId: null })}
                data-testid="exam-runner-clear-btn"
              >
                Clear answer
              </Button>
              <span className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => i - 1)}
                  data-testid="exam-runner-prev-btn"
                >
                  Previous
                </Button>
                {index < questions.length - 1 ? (
                  <Button onClick={() => setIndex((i) => i + 1)} data-testid="exam-runner-next-btn">
                    Next
                  </Button>
                ) : (
                  <Button onClick={() => setConfirming(true)} data-testid="exam-runner-finish-btn">
                    Finish exam
                  </Button>
                )}
              </span>
            </div>
          </Card>
        )}
      </div>

      <aside className="grid content-start gap-4">
        <Card title="Questions">
          <ul className="grid grid-cols-5 gap-2" aria-label="Question palette">
            {questions.map((x, i) => {
              const a = answers[x.id];
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    aria-label={`Question ${i + 1}${a?.optionId ? ', answered' : ''}${a?.flagged ? ', flagged' : ''}`}
                    aria-current={i === index ? 'step' : undefined}
                    onClick={() => setIndex(i)}
                    data-testid="exam-runner-palette-btn"
                    data-entity-id={x.id}
                    data-state={a?.flagged ? 'flagged' : a?.optionId ? 'answered' : 'unanswered'}
                    className={cn(
                      'h-9 w-full rounded-md border text-sm font-semibold',
                      a?.flagged
                        ? 'border-warning bg-warning/20 text-text'
                        : a?.optionId
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-border bg-card text-text',
                      i === index && 'ring-2 ring-secondary ring-offset-1',
                    )}
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ul>
          <p
            className="mt-3 text-xs text-muted"
            aria-live="polite"
            data-testid="exam-runner-save-status"
            data-state={saveState}
          >
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'All answers saved'}
            {saveState === 'error' && (
              <span className="text-error">
                Some answers are not saved.{' '}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={retry}
                  data-testid="exam-runner-retry-save-btn"
                >
                  Retry
                </button>
              </span>
            )}
          </p>
        </Card>
        {!confirming && (
          <Button
            onClick={() => setConfirming(true)}
            loading={submitting}
            data-testid="exam-runner-submit-btn"
          >
            Submit exam
          </Button>
        )}
        <InlineConfirm
          testId="exam-runner-submit"
          open={confirming}
          tone="primary"
          title="Submit your exam?"
          confirmLabel="Submit"
          loading={submitting}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void submit(false)}
          message={
            <>
              You answered <strong>{answeredCount}</strong> of {questions.length} questions
              {unanswered ? (
                <>
                  ; <strong>{unanswered}</strong> unanswered
                </>
              ) : null}
              . You cannot change your answers after submitting.
              {unsaved.size > 0 && (
                <span className="mt-2 block text-error">Some answers are not saved yet.</span>
              )}
            </>
          }
        />
      </aside>
    </div>
  );
}

export default function ExamRunnerPage() {
  const { attemptId } = useParams();
  const paper = usePaper(attemptId);
  if (paper.isPending) return <LoadingState label="Loading your exam…" />;
  if (paper.isError || !paper.data)
    return <ErrorState message={errorText(paper.error)} onRetry={() => void paper.refetch()} />;
  if (paper.data.status === 'submitted')
    return (
      <Card title={paper.data.examName}>
        <p className="mb-3 text-sm text-text">
          This attempt has been submitted
          {paper.data.autoSubmitted ? ' automatically when the time ran out' : ''}.
        </p>
        <Badge tone="success">Submitted</Badge>
        <div className="mt-4">
          <Link
            className="font-medium text-primary underline"
            to={`/student/results/${paper.data.attemptId}`}
          >
            See your result
          </Link>
        </div>
      </Card>
    );
  return <Runner key={paper.data.attemptId} paper={paper.data} />;
}
