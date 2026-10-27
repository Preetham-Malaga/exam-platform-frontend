// PURPOSE: /student/exams - exams assigned to the signed-in student that are open now; start or resume an attempt.
// WHY: The list comes from app.available_exams (assignment, window and status checked on the server). Starting twice
//      resumes the same attempt; the attempt limit is enforced by the server.
// DEPENDS ON: features/assessment/hooks.ts + format.ts, services/assessmentService.ts, shared UI.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { useToast } from '@/components/feedback/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/modals/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { errorText } from '@/features/academic/ui';
import { formatDateTime } from '@/features/assessment/format';
import { useAvailableExams } from '@/features/assessment/hooks';
import { attemptService } from '@/services/assessmentService';
import type { AvailableExam } from '@/types/assessment';

export default function StudentExamsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const exams = useAvailableExams();
  const [starting, setStarting] = useState<AvailableExam | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async (e: AvailableExam) => {
    setBusy(true);
    try {
      const a = await attemptService.start(e.examId);
      navigate(`/student/attempts/${a.attemptId}`);
    } catch (err) {
      toast({ title: 'Could not start the exam', description: errorText(err), variant: 'error' });
      setBusy(false);
      setStarting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="My Exams"
        description="Exams you can take now."
        breadcrumb={[{ label: 'My Exams' }]}
      />
      {exams.isPending ? (
        <LoadingState />
      ) : exams.isError ? (
        <ErrorState message={errorText(exams.error)} onRetry={() => void exams.refetch()} />
      ) : !exams.data.items.length ? (
        <EmptyState
          icon="file"
          title="No exams right now"
          description="Exams assigned to you appear here when they open."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exams.data.items.map((e) => {
            const left = e.maxAttempts - e.attemptsUsed;
            return (
              <Card key={e.examId} title={e.name}>
                <p className="mb-3 font-mono text-xs text-muted">{e.examCode}</p>
                <dl className="grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-muted">Duration</dt>
                  <dd>{e.durationMinutes} min</dd>
                  <dt className="text-muted">Questions</dt>
                  <dd>
                    {e.questionCount} · {e.totalMarks} marks
                  </dd>
                  <dt className="text-muted">Pass mark</dt>
                  <dd>{e.passingPercentage}%</dd>
                  <dt className="text-muted">Closes</dt>
                  <dd>{formatDateTime(e.endAt)}</dd>
                  <dt className="text-muted">Attempts</dt>
                  <dd>
                    {e.attemptsUsed} of {e.maxAttempts} used
                  </dd>
                </dl>
                <div className="mt-4 flex items-center justify-between">
                  {e.runningAttemptId ? <Badge tone="warning">In progress</Badge> : <span />}
                  {e.runningAttemptId ? (
                    <Button onClick={() => navigate(`/student/attempts/${e.runningAttemptId}`)}>
                      Resume
                    </Button>
                  ) : (
                    <Button
                      disabled={left <= 0}
                      onClick={() => setStarting(e)}
                      aria-label={`Start ${e.name}`}
                    >
                      {left <= 0 ? 'No attempts left' : 'Start'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(starting)}
        tone="primary"
        title={starting ? `Start ${starting.name}?` : 'Start exam?'}
        confirmLabel="Start now"
        loading={busy}
        onCancel={() => setStarting(null)}
        onConfirm={() => starting && void start(starting)}
        message={
          starting && (
            <>
              <p>
                You will have <strong>{starting.durationMinutes} minutes</strong>. The timer keeps
                running if you close the page; your answers are saved as you go.
              </p>
              {starting.description && (
                <p className="mt-2 whitespace-pre-wrap text-muted">{starting.description}</p>
              )}
            </>
          )
        }
      />
    </>
  );
}
