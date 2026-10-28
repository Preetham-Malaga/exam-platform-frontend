// PURPOSE: /org/exams/:examId (and /teacher/exams/:examId) - one exam: details & settings, its ordered question set,
//          who it is assigned to, and publish / unpublish / delete.
// WHY: Guide Part 9. The server enforces every rule (published questions only, scope, frozen after attempts, publish
//      needs settings + questions + an assignment); this page shows the state and offers only what can succeed.
// DEPENDS ON: features/assessment/*, features/academic (units, subjects), features/students (search), shared UI.

import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { useToast } from '@/components/feedback/Toast';
import { Checkbox, Input, Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlineConfirm } from '@/components/inline/Inline';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useSubjects, useUnitTree } from '@/features/academic/hooks';
import { unitOptions } from '@/features/academic/tree';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { ExamForm } from '@/features/assessment/ExamForm';
import { DIFFICULTY_TONE, formatDateTime } from '@/features/assessment/format';
import { useAssessmentMutation, useExam, useQuestions } from '@/features/assessment/hooks';
import { useStudents } from '@/features/students/hooks';
import { examService } from '@/services/assessmentService';
import type { Assignment, Exam, ExamBody, ExamQuestion, TargetType } from '@/types/assessment';

// ---------------- questions ----------------
function QuestionsTab({ exam, locked }: { exam: Exam; locked: string | null }) {
  const { toast } = useToast();
  const [list, setList] = useState<ExamQuestion[]>(exam.questions);
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const subjects = useSubjects({ page: 1, pageSize: 100, sort: 'name', status: 'active' });
  const bank = useQuestions({
    page: 1,
    pageSize: 20,
    status: 'published',
    ...(subject ? { subjectId: subject } : {}),
    ...(search ? { search } : {}),
  });
  const save = useAssessmentMutation((ids: string[]) => examService.setQuestions(exam.id, ids));
  const dirty =
    list.map((q) => q.questionId).join() !== exam.questions.map((q) => q.questionId).join();
  const total = list.reduce((s, q) => s + q.marks, 0);
  const move = (i: number, delta: -1 | 1) =>
    setList((l) => {
      const next = [...l];
      const [m] = next.splice(i, 1);
      next.splice(i + delta, 0, m!);
      return next;
    });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card
        title={`In this exam (${list.length} · ${total} marks)`}
        actions={
          !locked && (
            <Button
              size="sm"
              disabled={!dirty}
              loading={save.isPending}
              onClick={() =>
                save.mutate(
                  list.map((q) => q.questionId),
                  {
                    onSuccess: () => toast({ title: 'Questions saved', variant: 'success' }),
                    onError: (e) =>
                      toast({
                        title: 'Could not save the questions',
                        description: errorText(e),
                        variant: 'error',
                      }),
                  },
                )
              }
            >
              Save questions
            </Button>
          )
        }
      >
        {locked && <p className="mb-3 rounded-lg bg-warning/15 px-3 py-2 text-sm">{locked}</p>}
        {list.length === 0 ? (
          <p className="text-sm text-muted">
            No questions yet. Add published questions from the bank.
          </p>
        ) : (
          <ol className="grid gap-2" aria-label="Exam questions">
            {list.map((q, i) => (
              <li
                key={q.questionId}
                className="flex items-start gap-2 rounded-lg border border-border p-3"
              >
                <span className="w-6 pt-0.5 text-xs text-muted">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-text">{q.questionText}</p>
                  <p className="text-xs text-muted">
                    {q.subjectName} · {q.marks} marks
                  </p>
                </div>
                {!locked && (
                  <span className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move question ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move question ${i + 1} down`}
                      disabled={i === list.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove question ${i + 1}`}
                      onClick={() => setList((l) => l.filter((x) => x.questionId !== q.questionId))}
                    >
                      <Icon name="trash" size={16} />
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
      {!locked && (
        <Card title="Add from the question bank (published only)">
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Select
              label="Subject"
              placeholder="All subjects"
              value={subject}
              options={(subjects.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Input
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Question text"
            />
          </div>
          {bank.isPending ? (
            <LoadingState compact />
          ) : (bank.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted">No published questions match.</p>
          ) : (
            <ul className="grid gap-2" aria-label="Question bank">
              {bank.data!.items.map((q) => {
                const added = list.some((x) => x.questionId === q.id);
                return (
                  <li
                    key={q.id}
                    className="flex items-start gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-text">{q.questionText}</p>
                      <p className="flex items-center gap-2 text-xs text-muted">
                        {q.subjectName} · {q.marks} marks
                        <Badge tone={DIFFICULTY_TONE[q.difficulty] ?? 'neutral'}>
                          {q.difficulty}
                        </Badge>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={added ? 'ghost' : 'outline'}
                      disabled={added}
                      aria-label={
                        added ? 'Already added' : `Add question: ${q.questionText.slice(0, 40)}`
                      }
                      onClick={() =>
                        setList((l) => [
                          ...l,
                          {
                            questionId: q.id,
                            position: l.length + 1,
                            marks: q.marks,
                            negativeMarks: q.negativeMarks,
                            questionText: q.questionText,
                            questionType: q.questionType,
                            difficulty: q.difficulty,
                            status: q.status,
                            subjectName: q.subjectName,
                          },
                        ])
                      }
                    >
                      {added ? 'Added' : 'Add'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

// ---------------- assignment ----------------
type Target = Pick<Assignment, 'targetType' | 'targetId'> & { label: string };

function AssignmentTab({ exam, orgId }: { exam: Exam; orgId: string }) {
  const { toast } = useToast();
  const perms = usePermissions();
  const [targets, setTargets] = useState<Target[]>(
    exam.assignments.map((a) => ({
      targetType: a.targetType,
      targetId: a.targetId,
      label: a.targetName ?? '',
    })),
  );
  const [studentSearch, setStudentSearch] = useState('');
  const tree = useUnitTree();
  const units = useMemo(() => unitOptions(tree.data?.units ?? []), [tree.data]);
  const subjects = useSubjects({ page: 1, pageSize: 100, sort: 'name', status: 'active' });
  const students = useStudents({
    page: 1,
    pageSize: 8,
    ...(studentSearch ? { search: studentSearch } : {}),
  });
  const save = useAssessmentMutation((t: Target[]) =>
    examService.setAssignments(
      exam.id,
      t.map(({ targetType, targetId }) => ({ targetType, targetId })),
    ),
  );
  const has = (type: TargetType, id: string) =>
    targets.some((t) => t.targetType === type && t.targetId === id);
  const toggle = (type: TargetType, id: string, label: string) =>
    setTargets((ts) =>
      has(type, id)
        ? ts.filter((t) => !(t.targetType === type && t.targetId === id))
        : [...ts, { targetType: type, targetId: id, label }],
    );
  const whole = targets.some((t) => t.targetType === 'organization');
  const canAssign = perms.can('exam.assign');

  return (
    <div className="grid gap-4">
      <Card
        title="Who takes this exam"
        actions={
          canAssign && (
            <Button
              size="sm"
              loading={save.isPending}
              onClick={() =>
                save.mutate(targets, {
                  onSuccess: () => toast({ title: 'Assignment saved', variant: 'success' }),
                  onError: (e) =>
                    toast({
                      title: 'Could not save the assignment',
                      description: errorText(e),
                      variant: 'error',
                    }),
                })
              }
            >
              Save assignment
            </Button>
          )
        }
      >
        <p className="mb-3 text-sm text-muted">
          A unit includes every unit below it (e.g. B.Tech includes all its branches). A subject
          reaches students placed on that subject&apos;s unit.
        </p>
        <Checkbox
          label="Everyone in the organization"
          checked={whole}
          disabled={!canAssign}
          onChange={() => toggle('organization', orgId, 'Whole organization')}
        />
        {targets.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected groups">
            {targets.map((t) => (
              <li key={`${t.targetType}:${t.targetId}`}>
                <Badge tone="info">
                  {t.targetType === 'organization' ? 'Whole organization' : t.label}
                  {canAssign && (
                    <button
                      type="button"
                      className="ml-1.5"
                      aria-label={`Remove ${t.label || t.targetType}`}
                      onClick={() => toggle(t.targetType, t.targetId, t.label)}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {!whole && canAssign && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Academic units">
            <div className="grid max-h-64 gap-1.5 overflow-y-auto">
              {units.length === 0 && <p className="text-sm text-muted">No units yet.</p>}
              {units.map((u) => (
                <Checkbox
                  key={u.value}
                  label={u.label}
                  checked={has('academic_unit', u.value)}
                  onChange={() => toggle('academic_unit', u.value, u.label)}
                />
              ))}
            </div>
          </Card>
          <Card title="Subjects">
            <div className="grid max-h-64 gap-1.5 overflow-y-auto">
              {(subjects.data?.items ?? []).length === 0 && (
                <p className="text-sm text-muted">No subjects yet.</p>
              )}
              {(subjects.data?.items ?? []).map((s) => (
                <Checkbox
                  key={s.id}
                  label={`${s.name} (${s.code})`}
                  checked={has('subject', s.id)}
                  onChange={() => toggle('subject', s.id, s.name)}
                />
              ))}
            </div>
          </Card>
          <Card title="Individual students">
            <Input
              label="Find a student"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Name or roll number"
            />
            <div className="mt-2 grid max-h-52 gap-1.5 overflow-y-auto">
              {(students.data?.items ?? []).map((s) => (
                <Checkbox
                  key={s.id}
                  label={`${s.fullName} (${s.rollNumber})`}
                  checked={has('student', s.id)}
                  onChange={() => toggle('student', s.id, `${s.fullName} (${s.rollNumber})`)}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------- page ----------------
export default function ExamDetailPage() {
  const { examId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const base = useAreaBase();
  const { toast } = useToast();
  const perms = usePermissions();
  const { me } = useAuth();
  const exam = useExam(examId);
  const [confirm, setConfirm] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
  const update = useAssessmentMutation((b: ExamBody) => examService.update(examId!, b));
  const action = useAssessmentMutation<'publish' | 'unpublish' | 'delete', unknown>((a) =>
    a === 'publish'
      ? examService.publish(examId!)
      : a === 'unpublish'
        ? examService.unpublish(examId!)
        : examService.remove(examId!),
  );
  const tab = params.get('tab') ?? 'details';

  if (exam.isPending) return <LoadingState />;
  if (exam.isError || !exam.data)
    return <ErrorState message={errorText(exam.error)} onRetry={() => void exam.refetch()} />;
  const e = exam.data;
  const published = e.status === 'published';
  const locked = published
    ? 'This exam is published. Unpublish it to change its details or questions.'
    : e.attemptCount > 0
      ? 'Students have already taken this exam, so its questions can no longer change.'
      : null;
  const runAction = (a: 'publish' | 'unpublish' | 'delete') =>
    action.mutate(a, {
      onSuccess: () => {
        toast({
          title:
            a === 'publish'
              ? 'Exam published'
              : a === 'unpublish'
                ? 'Exam unpublished'
                : 'Exam deleted',
          variant: 'success',
        });
        setConfirm(null);
        if (a === 'delete') navigate(`${base}/exams`);
      },
      onError: (err) => {
        toast({ title: 'Action failed', description: errorText(err), variant: 'error' });
        setConfirm(null);
      },
    });
  const orgId = me?.organization?.id ?? '';

  return (
    <>
      <PageHeader
        title={e.name}
        description={`${e.examCode} · ${e.questionCount} questions · ${e.totalMarks} marks · ${e.durationMinutes} min · pass ${e.passingPercentage}%`}
        breadcrumb={[{ label: 'Exams' }, { label: 'Exams' }, { label: e.name }]}
        actions={
          <>
            <StatusBadge status={e.status} />
            {!published && perms.can('exam.publish') && (
              <Button
                onClick={() => setConfirm('publish')}
                data-testid="exam-publish-btn"
                disabled={!e.questionCount || !e.assignmentCount}
              >
                Publish
              </Button>
            )}
            {published && perms.can('exam.unpublish') && (
              <Button
                variant="outline"
                onClick={() => setConfirm('unpublish')}
                data-testid="exam-unpublish-btn"
              >
                Unpublish
              </Button>
            )}
            {!published && e.attemptCount === 0 && perms.can('exam.delete') && (
              <Button
                variant="ghost"
                aria-label="Delete exam"
                onClick={() => setConfirm('delete')}
                data-testid="exam-delete-btn"
              >
                <Icon name="trash" size={16} />
              </Button>
            )}
          </>
        }
      />
      <InlineConfirm
        open={Boolean(confirm)}
        testId={`exam-${confirm ?? 'action'}`}
        className="mb-4"
        tone={confirm === 'delete' ? 'danger' : 'primary'}
        title={
          confirm === 'publish'
            ? 'Publish this exam?'
            : confirm === 'unpublish'
              ? 'Unpublish this exam?'
              : 'Delete this exam?'
        }
        confirmLabel={
          confirm === 'publish' ? 'Publish' : confirm === 'unpublish' ? 'Unpublish' : 'Delete exam'
        }
        loading={action.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && runAction(confirm)}
        message={
          confirm === 'publish'
            ? 'Assigned students can start it as soon as its opening time is reached.'
            : confirm === 'unpublish'
              ? 'Students can no longer start it. Attempts already running can still be submitted.'
              : 'The exam will be removed. Exams that students have taken cannot be deleted.'
        }
      />
      {!published && (!e.questionCount || !e.assignmentCount) && (
        <p
          role="note"
          className="mb-4 rounded-lg bg-secondary/20 px-4 py-2 text-sm text-text"
          data-testid="exam-checklist"
        >
          To publish: {!e.questionCount && 'add at least one question'}
          {!e.questionCount && !e.assignmentCount && ' and '}
          {!e.assignmentCount && 'assign the exam to at least one group'}.
        </p>
      )}
      <Tabs
        label="Exam sections"
        testId="exam"
        value={tab}
        onChange={(id) => setParams({ tab: id }, { replace: true })}
        tabs={[
          {
            id: 'details',
            label: 'Details & settings',
            content: (
              <Card
                title="Details"
                actions={
                  !published &&
                  perms.can('exam.update') && (
                    <Button
                      size="sm"
                      type="submit"
                      form="exam-form"
                      loading={update.isPending}
                      data-testid="exam-details-save-btn"
                    >
                      Save details
                    </Button>
                  )
                }
              >
                <p className="mb-4 text-xs text-muted">
                  Opens {formatDateTime(e.startAt)} · closes {formatDateTime(e.endAt)} · created by{' '}
                  {e.createdByName || '—'}
                </p>
                <ExamForm
                  key={e.updatedAt}
                  id="exam-form"
                  exam={e}
                  disabled={published || !perms.can('exam.update')}
                  onSubmit={(body) =>
                    update.mutate(body, {
                      onSuccess: () => toast({ title: 'Exam saved', variant: 'success' }),
                      onError: (err) =>
                        toast({
                          title: 'Could not save the exam',
                          description: errorText(err),
                          variant: 'error',
                        }),
                    })
                  }
                />
              </Card>
            ),
          },
          {
            id: 'questions',
            label: `Questions (${e.questionCount})`,
            content: <QuestionsTab key={e.updatedAt + e.questionCount} exam={e} locked={locked} />,
          },
          {
            id: 'assignment',
            label: `Assignment (${e.assignmentCount})`,
            content: <AssignmentTab key={e.updatedAt + e.assignmentCount} exam={e} orgId={orgId} />,
          },
        ]}
      />
    </>
  );
}
