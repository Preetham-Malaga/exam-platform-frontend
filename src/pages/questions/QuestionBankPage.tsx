// PURPOSE: /org/questions and /teacher/questions - the question bank: filter by subject/topic/status/difficulty, search,
//          create and edit questions, publish, archive and delete.
// WHY: Guide Part 18 step 12. Teachers see only their scope (RLS); students cannot open this page or its API.
// DEPENDS ON: features/assessment/*, features/academic/hooks.ts, shared table/form/dialog components.

import { useMemo, useState } from 'react';
import { useToast } from '@/components/feedback/Toast';
import { Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlineConfirm } from '@/components/inline/Inline';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dropdown, type MenuItem } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { useSubjects, useTopics } from '@/features/academic/hooks';
import { errorText } from '@/features/academic/ui';
import { DIFFICULTY_TONE, TYPE_LABEL } from '@/features/assessment/format';
import { useAssessmentMutation, useQuestions } from '@/features/assessment/hooks';
import { QuestionEditor } from '@/features/assessment/QuestionEditor';
import { Can } from '@/features/auth/Can';
import { questionService } from '@/services/assessmentService';
import type { Difficulty, QuestionStatus, QuestionSummary } from '@/types/assessment';

const PAGE_SIZE = 10;

export default function QuestionBankPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'createdAt', order: 'desc' });
  const [editor, setEditor] = useState<{ id: string | null } | null>(null);
  const [deleting, setDeleting] = useState<QuestionSummary | null>(null);

  const subjects = useSubjects({ page: 1, pageSize: 100, sort: 'name', status: 'active' });
  const topics = useTopics({ page: 1, pageSize: 100, subjectId: subject }, Boolean(subject));
  const subjectOptions = useMemo(
    () =>
      (subjects.data?.items ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
    [subjects.data],
  );
  const q = useQuestions({
    page,
    pageSize: PAGE_SIZE,
    sort: sort.key,
    order: sort.order,
    ...(search ? { search } : {}),
    ...(subject ? { subjectId: subject } : {}),
    ...(topic ? { topicId: topic } : {}),
    ...(status ? { status: status as QuestionStatus } : {}),
    ...(difficulty ? { difficulty: difficulty as Difficulty } : {}),
  });
  const publish = useAssessmentMutation((id: string) => questionService.publish(id));
  const setQStatus = useAssessmentMutation((v: { id: string; status: 'draft' | 'archived' }) =>
    questionService.setStatus(v.id, v.status),
  );
  const remove = useAssessmentMutation((id: string) => questionService.remove(id));
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const fail = (title: string) => (e: unknown) =>
    toast({ title, description: errorText(e), variant: 'error' });
  // One inline editor or confirmation at a time.
  const openEditor = (id: string | null) => {
    setDeleting(null);
    setEditor({ id });
  };
  const askDelete = (row: QuestionSummary) => {
    setEditor(null);
    setDeleting(row);
  };
  const defaultSubject = subject || subjectOptions[0]?.value || '';

  const menu = (row: QuestionSummary): MenuItem[] => {
    const items: MenuItem[] = [];
    if (perms.can('question.update'))
      items.push({
        label: 'Edit',
        testId: 'row-actions-edit-menu-item',
        onSelect: () => openEditor(row.id),
      });
    if (row.status !== 'published' && perms.can('question.publish'))
      items.push({
        label: 'Publish',
        testId: 'row-actions-publish-menu-item',
        onSelect: () =>
          publish.mutate(row.id, {
            onSuccess: () => toast({ title: 'Question published', variant: 'success' }),
            onError: fail('Could not publish the question'),
          }),
      });
    if (row.status === 'published' && perms.can('question.update'))
      items.push({
        label: 'Archive',
        testId: 'row-actions-archive-menu-item',
        onSelect: () =>
          setQStatus.mutate(
            { id: row.id, status: 'archived' },
            {
              onSuccess: () => toast({ title: 'Question archived', variant: 'success' }),
              onError: fail('Could not archive'),
            },
          ),
      });
    if (row.status === 'archived' && perms.can('question.update'))
      items.push({
        label: 'Back to draft',
        testId: 'row-actions-draft-menu-item',
        onSelect: () =>
          setQStatus.mutate(
            { id: row.id, status: 'draft' },
            { onError: fail('Could not change the status') },
          ),
      });
    if (perms.can('question.delete'))
      items.push({
        label: 'Delete',
        danger: true,
        testId: 'row-actions-delete-menu-item',
        onSelect: () => askDelete(row),
      });
    return items;
  };

  return (
    <>
      <PageHeader
        title="Question Bank"
        description="Objective questions with a protected answer key. Only published questions can be used in exams."
        breadcrumb={[{ label: 'Content Management' }, { label: 'Question Bank' }]}
        actions={
          <Can permission="question.create">
            <Button
              leftIcon={<Icon name="plus" size={16} />}
              disabled={!subjectOptions.length}
              title={subjectOptions.length ? undefined : 'No subject available'}
              onClick={() => openEditor(null)}
              data-testid="questions-add-btn"
            >
              New question
            </Button>
          </Can>
        }
      />
      <QuestionEditor
        open={editor?.id === null}
        questionId={null}
        defaultSubject={defaultSubject}
        onClose={() => setEditor(null)}
        className="mb-4"
      />
      <Card padded={false}>
        <FilterBar
          canClear={Boolean(search || subject || topic || status || difficulty)}
          onClear={() =>
            reset(() => {
              setSearch('');
              setSubject('');
              setTopic('');
              setStatus('');
              setDifficulty('');
            })
          }
        >
          <SearchInput
            value={search}
            onSearch={(v) => reset(() => setSearch(v))}
            placeholder="Search question text"
            label="Search questions"
          />
          <div className="w-56">
            <Select
              label="Subject"
              placeholder="All subjects"
              value={subject}
              options={subjectOptions}
              onChange={(e) => reset(() => (setSubject(e.target.value), setTopic('')))}
            />
          </div>
          <div className="w-44">
            <Select
              label="Topic"
              placeholder="All topics"
              value={topic}
              disabled={!subject}
              options={(topics.data?.items ?? []).map((t) => ({ value: t.id, label: t.name }))}
              onChange={(e) => reset(() => setTopic(e.target.value))}
            />
          </div>
          <div className="w-36">
            <Select
              label="Status"
              placeholder="Any status"
              value={status}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' },
              ]}
              onChange={(e) => reset(() => setStatus(e.target.value))}
            />
          </div>
          <div className="w-36">
            <Select
              label="Difficulty"
              placeholder="Any"
              value={difficulty}
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
              onChange={(e) => reset(() => setDifficulty(e.target.value))}
            />
          </div>
        </FilterBar>
        <DataTable<QuestionSummary>
          caption="Questions"
          rows={q.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={(s) => reset(() => setSort(s))}
          emptyTitle={
            search || subject || status || difficulty
              ? 'No questions match your filters'
              : 'No questions yet'
          }
          columns={[
            {
              key: 'questionText',
              header: 'Question',
              cell: (r) => (
                <div className="max-w-xl">
                  <p className="line-clamp-2 font-medium text-text">{r.questionText}</p>
                  <p className="text-xs text-muted">
                    {r.subjectName}
                    {r.topicName ? ` · ${r.topicName}` : ''} · {TYPE_LABEL[r.questionType]}
                  </p>
                </div>
              ),
            },
            {
              key: 'difficulty',
              header: 'Difficulty',
              sortable: true,
              cell: (r) => (
                <Badge tone={DIFFICULTY_TONE[r.difficulty] ?? 'neutral'}>{r.difficulty}</Badge>
              ),
            },
            {
              key: 'marks',
              header: 'Marks',
              sortable: true,
              cell: (r) => (
                <span>
                  {r.marks}
                  {r.negativeMarks ? (
                    <span className="text-xs text-muted"> (−{r.negativeMarks})</span>
                  ) : null}
                </span>
              ),
            },
            { key: 'examCount', header: 'Exams', cell: (r) => r.examCount },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              cell: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              cell: (r) => {
                const items = menu(r);
                return items.length ? (
                  <Dropdown
                    label={`Actions for question ${r.questionText.slice(0, 40)}`}
                    testId="row-actions"
                    trigger={<Icon name="more" />}
                    items={items}
                  />
                ) : null;
              },
            },
          ]}
          testId="question"
          expandedRow={(r) =>
            editor?.id === r.id ? (
              <QuestionEditor
                open
                questionId={r.id}
                defaultSubject={defaultSubject}
                onClose={() => setEditor(null)}
              />
            ) : deleting?.id === r.id ? (
              <InlineConfirm
                open
                testId="question-delete"
                title="Delete this question?"
                confirmLabel="Delete question"
                loading={remove.isPending}
                onCancel={() => setDeleting(null)}
                onConfirm={() =>
                  remove.mutate(r.id, {
                    onSuccess: () => {
                      toast({ title: 'Question deleted', variant: 'success' });
                      setDeleting(null);
                    },
                    onError: (e) => {
                      fail('Could not delete the question')(e);
                      setDeleting(null);
                    },
                  })
                }
                message="Questions used in an exam cannot be deleted; archive them instead."
              />
            ) : null
          }
        />
        {q.data && (
          <Pagination
            page={q.data.pagination.page}
            totalPages={q.data.pagination.totalPages}
            total={q.data.pagination.total}
            pageSize={q.data.pagination.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </>
  );
}
