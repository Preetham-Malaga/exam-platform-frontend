// PURPOSE: /org/topics (and /teacher/topics) - topics inside subjects: list by subject, add, rename, delete.
// WHY: Teachers organize their own subjects into topics; the subject list they can pick from is already limited to their
//      scope by the API (RLS), so a teacher can never add a topic to someone else's subject.
// DEPENDS ON: features/academic/*, shared table/form/dialog components.

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlineConfirm, InlinePanel } from '@/components/inline/Inline';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { Can } from '@/features/auth/Can';
import { useAcademicMutation, useSubjects, useTopics } from '@/features/academic/hooks';
import { topicSchema } from '@/features/academic/schemas';
import { RowActions, errorText } from '@/features/academic/ui';
import { academicService } from '@/services/academicService';
import type { Topic } from '@/types/academic';

const PAGE_SIZE = 20;
const formSchema = topicSchema.extend({ subjectId: z.string().min(1, 'Choose a subject') });
type FormValues = z.infer<typeof formSchema>;

/** Add form (above the list) or rename form (under the topic's row). */
function TopicForm({
  open,
  topic,
  subjects,
  defaultSubject,
  onClose,
  className,
}: {
  open: boolean;
  topic: Topic | null;
  subjects: Array<{ value: string; label: string }>;
  defaultSubject: string;
  onClose: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const create = useAcademicMutation((v: FormValues) => academicService.createTopic(v));
  const update = useAcademicMutation((v: { id: string; name: string }) =>
    academicService.updateTopic(v.id, { name: v.name }),
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: { name: topic?.name ?? '', subjectId: topic?.subjectId ?? defaultSubject },
  });
  const close = () => {
    form.reset();
    onClose();
  };
  const onSubmit = form.handleSubmit((v) => {
    const fail = (title: string) => (e: unknown) =>
      toast({ title, description: errorText(e), variant: 'error' });
    const done = (title: string) => () => {
      toast({ title, variant: 'success' });
      close();
    };
    if (topic)
      update.mutate(
        { id: topic.id, name: v.name },
        { onSuccess: done('Topic renamed'), onError: fail('Could not rename the topic') },
      );
    else
      create.mutate(v, {
        onSuccess: done('Topic added'),
        onError: fail('Could not add the topic'),
      });
  });
  return (
    <InlinePanel
      open={open}
      onClose={close}
      title={topic ? `Rename ${topic.name}` : 'New topic'}
      testId="topic-form"
      {...(className ? { className } : {})}
      footer={
        <>
          <Button variant="outline" onClick={close} data-testid="topic-form-cancel-btn">
            Cancel
          </Button>
          <Button
            type="submit"
            form="topic-form"
            loading={create.isPending || update.isPending}
            data-testid="topic-form-save-btn"
          >
            {topic ? 'Save' : 'Add topic'}
          </Button>
        </>
      }
    >
      <form id="topic-form" noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Subject"
          required
          placeholder="Choose a subject"
          disabled={Boolean(topic)}
          options={subjects}
          error={form.formState.errors.subjectId?.message}
          data-testid="topic-form-subject-select"
          {...form.register('subjectId')}
        />
        <Input
          label="Topic name"
          required
          data-autofocus
          placeholder="e.g. Transformers"
          error={form.formState.errors.name?.message}
          data-testid="topic-form-name-input"
          {...form.register('name')}
        />
      </form>
    </InlinePanel>
  );
}

export default function TopicsPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'position', order: 'asc' });
  const [editing, setEditing] = useState<Topic | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Topic | null>(null);

  const subjectList = useSubjects({ page: 1, pageSize: 100, sort: 'name', status: 'active' });
  const subjects = useMemo(
    () =>
      (subjectList.data?.items ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
    [subjectList.data],
  );
  const q = useTopics({
    page,
    pageSize: PAGE_SIZE,
    sort: sort.key,
    order: sort.order,
    ...(subject ? { subjectId: subject } : {}),
    ...(search ? { search } : {}),
  });
  const remove = useAcademicMutation((id: string) => academicService.deleteTopic(id));
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  // One inline form or confirmation at a time.
  const show = (next: { creating?: boolean; editing?: Topic; deleting?: Topic }) => {
    setCreating(Boolean(next.creating));
    setEditing(next.editing ?? null);
    setDeleting(next.deleting ?? null);
  };
  const closeForm = () => show({});

  return (
    <>
      <PageHeader
        title="Topics"
        description="Break each subject into topics. Questions can be tagged with a topic."
        breadcrumb={[{ label: 'Syllabus' }, { label: 'Topics' }]}
        actions={
          <Can permission="topic.create">
            <Button
              leftIcon={<Icon name="plus" size={16} />}
              disabled={subjects.length === 0}
              title={subjects.length === 0 ? 'Create a subject first' : undefined}
              onClick={() => show({ creating: true })}
              data-testid="topics-add-btn"
            >
              New topic
            </Button>
          </Can>
        }
      />
      <TopicForm
        open={creating}
        topic={null}
        subjects={subjects}
        defaultSubject={subject}
        onClose={closeForm}
        className="mb-4"
      />
      <Card padded={false}>
        <FilterBar
          canClear={Boolean(subject || search)}
          onClear={() =>
            reset(() => {
              setSubject('');
              setSearch('');
            })
          }
        >
          <div className="w-64">
            <Select
              label="Subject"
              placeholder="All subjects"
              value={subject}
              options={subjects}
              onChange={(ev) => reset(() => setSubject(ev.target.value))}
            />
          </div>
          <SearchInput
            value={search}
            onSearch={(v) => reset(() => setSearch(v))}
            placeholder="Search topics"
            label="Search topics"
          />
        </FilterBar>
        <DataTable<Topic>
          caption="Topics"
          rows={q.data?.items ?? []}
          rowKey={(t) => t.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={(s) => reset(() => setSort(s))}
          emptyTitle={subject || search ? 'No topics match your filters' : 'No topics yet'}
          columns={[
            {
              key: 'position',
              header: '#',
              sortable: true,
              className: 'w-12',
              cell: (t) => t.position,
            },
            {
              key: 'name',
              header: 'Topic',
              sortable: true,
              cell: (t) => <span className="font-medium text-text">{t.name}</span>,
            },
            { key: 'subject', header: 'Subject', cell: (t) => t.subjectName },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              cell: (t) => (
                <RowActions
                  label={t.name}
                  onEdit={perms.can('topic.update') ? () => show({ editing: t }) : undefined}
                  onDelete={perms.can('topic.delete') ? () => show({ deleting: t }) : undefined}
                />
              ),
            },
          ]}
          testId="topic"
          expandedRow={(t) =>
            editing?.id === t.id ? (
              <TopicForm
                open
                topic={t}
                subjects={subjects}
                defaultSubject={subject}
                onClose={closeForm}
              />
            ) : deleting?.id === t.id ? (
              <InlineConfirm
                open
                testId="topic-delete"
                title="Delete this topic?"
                confirmLabel="Delete topic"
                loading={remove.isPending}
                onCancel={closeForm}
                onConfirm={() =>
                  remove.mutate(t.id, {
                    onSuccess: () => {
                      toast({ title: 'Topic deleted', variant: 'success' });
                      closeForm();
                    },
                    onError: (err) => {
                      toast({
                        title: 'Could not delete the topic',
                        description: errorText(err),
                        variant: 'error',
                      });
                      closeForm();
                    },
                  })
                }
                message={
                  <>
                    <strong>{t.name}</strong> will be removed. Topics used by questions cannot be
                    deleted.
                  </>
                }
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
