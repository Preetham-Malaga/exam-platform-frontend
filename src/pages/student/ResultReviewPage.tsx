// PURPOSE: /student/results/:attemptId - one submitted attempt: score summary and, when the exam allows it, every
//          question with the student's answer, the correct answer and the explanation.
// WHY: Correct answers are sent by the server only when the exam's "show correct answers" setting is on.
// DEPENDS ON: features/assessment/hooks.ts + format.ts, shared UI.

import { Link, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, StatCard } from '@/components/ui/Card';
import { errorText } from '@/features/academic/ui';
import { RESULT_TONE, formatDuration, formatPercent } from '@/features/assessment/format';
import { useReview } from '@/features/assessment/hooks';
import { cn } from '@/utils/cn';

export default function ResultReviewPage() {
  const { attemptId } = useParams();
  const q = useReview(attemptId);
  if (q.isPending) return <LoadingState />;
  if (q.isError || !q.data)
    return <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />;
  const { result: r, showAnswers, review } = q.data;
  return (
    <>
      <PageHeader
        title="Your result"
        breadcrumb={[{ label: 'Results' }, { label: 'Result' }]}
        actions={<Badge tone={RESULT_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Score" value={`${r.score} / ${r.maximumScore}`} icon="trophy" />
        <StatCard label="Percentage" value={formatPercent(r.percentage)} icon="chart" />
        <StatCard
          label="Correct · wrong · unanswered"
          value={`${r.correctCount} · ${r.wrongCount} · ${r.unansweredCount}`}
          icon="check"
        />
        <StatCard label="Time taken" value={formatDuration(r.durationSeconds)} icon="clock" />
      </div>
      {!showAnswers || !review ? (
        <Card>
          <p className="text-sm text-muted">
            The correct answers for this exam are not shown to students.
          </p>
        </Card>
      ) : (
        <ol className="grid gap-4" aria-label="Answers">
          {review.map((item, i) => (
            <li key={item.id}>
              <Card>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-medium text-text">
                    {i + 1}. {item.text}
                  </p>
                  <Badge
                    tone={item.isCorrect ? 'success' : item.selectedOptionId ? 'error' : 'neutral'}
                  >
                    {item.isCorrect ? 'Correct' : item.selectedOptionId ? 'Wrong' : 'Not answered'}{' '}
                    · {item.marksAwarded}/{item.marks}
                  </Badge>
                </div>
                <ul className="grid gap-1.5">
                  {item.options.map((o) => {
                    const correct = o.id === item.correctOptionId;
                    const mine = o.id === item.selectedOptionId;
                    return (
                      <li
                        key={o.id}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm',
                          correct
                            ? 'border-success bg-success/10'
                            : mine
                              ? 'border-error bg-error/10'
                              : 'border-border',
                        )}
                      >
                        {o.text}
                        {correct && (
                          <span className="ml-2 text-xs font-semibold text-success">
                            Correct answer
                          </span>
                        )}
                        {mine && !correct && (
                          <span className="ml-2 text-xs font-semibold text-error">Your answer</span>
                        )}
                        {mine && correct && (
                          <span className="ml-2 text-xs font-semibold text-success">
                            · Your answer
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {item.explanation && <p className="mt-3 text-sm text-muted">{item.explanation}</p>}
              </Card>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-sm">
        <Link className="font-medium text-primary underline" to="/student/results">
          Back to my results
        </Link>
      </p>
    </>
  );
}
