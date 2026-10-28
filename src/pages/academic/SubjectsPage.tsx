// PURPOSE: /org/subjects (and /teacher/subjects) - list, search, filter, create, edit and delete subjects.
// WHY: Questions and exams hang off subjects. Teachers see only the subjects in their scope (enforced by RLS) and get no
//      edit buttons; owners/admins manage everything.
// DEPENDS ON: features/academic/*, shared table/form/dialog components.

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select, Textarea } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlineConfirm, InlinePanel } from '@/components/inline/Inline';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { Can } from '@/features/auth/Can';
import {
  useAcademicMutation,
  useCourses,
  useSubjects,
  useUnitTree,
} from '@/features/academic/hooks';
import { orNull, subjectSchema, type SubjectValues } from '@/features/academic/schemas';
import { unitOptions } from '@/features/academic/tree';
import { RowActions, errorText } from '@/features/academic/ui';
import { academicService } from '@/services/academicService';
import type { ActiveStatus, Subject } from '@/types/academic';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];
type Option = { value: string; label: string };

const toBody = (v: SubjectValues) => ({
  code: v.code,
  name: v.name,
  description: orNull(v.description),
  courseId: orNull(v.courseId),
  academicUnitId: orNull(v.academicUnitId),
});

/** Add form (above the list) or edit form (under the subject's row). */
function SubjectForm({
  open,
  subject,
  courses,
  units,
  onClose,
  className,
}: {
  open: boolean;
  subject: Subject | null;
  courses: Option[];
  units: Option[];
  onClose: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const create = useAcademicMutation((v: SubjectValues) =>
    academicService.createSubject(toBody(v)),
  );
  const update = useAcademicMutation((v: SubjectValues & { id: string }) =>
    academicService.updateSubject(v.id, { ...toBody(v), status: v.status }),
  );
  const form = useForm<SubjectValues>({
    resolver: zodResolver(subjectSchema),
    values: {
      code: subject?.code ?? '',
      name: subject?.name ?? '',
      description: subject?.description ?? '',
      courseId: subject?.courseId ?? '',
      academicUnitId: subject?.academicUnitId ?? '',
      status: subject?.status ?? 'active',
    },
  });
  const close = () => {
    form.reset();
    onClose();
  };
  const onSubmit = form.handleSubmit((v) => {
    const done = (title: string) => () => {
      toast({ title, variant: 'success' });
      close();
    };
    const fail = (title: string) => (e: unknown) =>
      toast({ title, description: errorText(e), variant: 'error' });
    if (subject)
      update.mutate(
        { ...v, id: subject.id },
        { onSuccess: done('Subject updated'), onError: fail('Could not update the subject') },
      );
    else
      create.mutate(v, {
        onSuccess: done('Subject created'),
        onError: fail('Could not create the subject'),
      });
  });
  const e = form.formState.errors;
  return (
    <InlinePanel
      open={open}
      onClose={close}
      title={subject ? `Edit ${subject.name}` : 'New subject'}
      testId="subject-form"
      {...(className ? { className } : {})}
      footer={
        <>
          <Button variant="outline" onClick={close} data-testid="subject-form-cancel-btn">
            Cancel
          </Button>
          <Button
            type="submit"
            form="subject-form"
            loading={create.isPending || update.isPending}
            data-testid="subject-form-save-btn"
          >
            {subject ? 'Save' : 'Create subject'}
          </Button>
        </>
      }
    >
      <form id="subject-form" noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          required
          data-autofocus
          placeholder="e.g. Electrical Machines"
          error={e.name?.message}
          data-testid="subject-form-name-input"
          {...form.register('name')}
        />
        <Input
          label="Code"
          required
          placeholder="e.g. EE201"
          hint="Unique in your organization."
          error={e.code?.message}
          data-testid="subject-form-code-input"
          {...form.register('code')}
        />
        <Select
          label="Course"
          placeholder="No course"
          options={courses}
          data-testid="subject-form-course-select"
          {...form.register('courseId')}
        />
        <Select
          label="Academic unit"
          placeholder="No unit"
          hint="Teachers scoped to this unit (or a parent unit) can work on the subject."
          options={units}
          data-testid="subject-form-unit-select"
          {...form.register('academicUnitId')}
        />
        {subject && (
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            data-testid="subject-form-status-select"
            {...form.register('status')}
          />
        )}
        <Textarea
          label="Description"
          rows={3}
          className="sm:col-span-2"
          error={e.description?.message}
          data-testid="subject-form-description-textarea"
          {...form.register('description')}
        />
      </form>
    </InlinePanel>
  );
}

export default function SubjectsPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'code', order: 'asc' });
  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const tree = useUnitTree();
  const units = useMemo(() => unitOptions(tree.data?.units ?? []), [tree.data]);
  const courseList = useCourses({ page: 1, pageSize: 100, sort: 'name' }, perms.can('course.read'));
  const courses = useMemo(
    () =>
      (courseList.data?.items ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
    [courseList.data],
  );
  const q = useSubjects({
    page,
    pageSize: PAGE_SIZE,
    sort: sort.key,
    order: sort.order,
    ...(search ? { search } : {}),
    ...(course ? { courseId: course } : {}),
    ...(status ? { status: status as ActiveStatus } : {}),
  });
  const remove = useAcademicMutation((id: string) => academicService.deleteSubject(id));
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  // One inline form or confirmation at a time.
  const show = (next: { creating?: boolean; editing?: Subject; deleting?: Subject }) => {
    setCreating(Boolean(next.creating));
    setEditing(next.editing ?? null);
    setDeleting(next.deleting ?? null);
  };
  const closeForm = () => show({});
  const manages = perms.canAny(['subject.update', 'subject.delete']);

  return (
    <>
      <PageHeader
        title="Subjects"
        description={
          manages
            ? 'Subjects taught in your organization. Questions and exams are created per subject.'
            : 'The subjects assigned to you.'
        }
        breadcrumb={[{ label: 'Syllabus' }, { label: 'Subjects' }]}
        actions={
          <Can permission="subject.create">
            <Button
              leftIcon={<Icon name="plus" size={16} />}
              onClick={() => show({ creating: true })}
              data-testid="subjects-add-btn"
            >
              New subject
            </Button>
          </Can>
        }
      />
      <SubjectForm
        open={creating}
        subject={null}
        courses={courses}
        units={units}
        onClose={closeForm}
        className="mb-4"
      />
      <Card padded={false}>
        <FilterBar
          canClear={Boolean(search || course || status)}
          onClear={() =>
            reset(() => {
              setSearch('');
              setCourse('');
              setStatus('');
            })
          }
        >
          <SearchInput
            value={search}
            onSearch={(v) => reset(() => setSearch(v))}
            placeholder="Search name or code"
            label="Search subjects"
          />
          <div className="w-56">
            <Select
              label="Course"
              placeholder="All courses"
              value={course}
              options={courses}
              onChange={(ev) => reset(() => setCourse(ev.target.value))}
            />
          </div>
          <div className="w-36">
            <Select
              label="Status"
              placeholder="Any status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(ev) => reset(() => setStatus(ev.target.value))}
            />
          </div>
        </FilterBar>
        <DataTable<Subject>
          caption="Subjects"
          rows={q.data?.items ?? []}
          rowKey={(s) => s.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={(s) => reset(() => setSort(s))}
          emptyTitle={
            search || course || status
              ? 'No subjects match your filters'
              : manages
                ? 'No subjects yet'
                : 'No subjects are assigned to you yet'
          }
          columns={[
            {
              key: 'code',
              header: 'Code',
              sortable: true,
              cell: (s) => <span className="font-mono text-xs">{s.code}</span>,
            },
            {
              key: 'name',
              header: 'Name',
              sortable: true,
              cell: (s) => (
                <div>
                  <p className="font-medium text-text">{s.name}</p>
                  {s.description && (
                    <p className="line-clamp-1 text-xs text-muted">{s.description}</p>
                  )}
                </div>
              ),
            },
            { key: 'course', header: 'Course', cell: (s) => s.courseName ?? '—' },
            { key: 'unit', header: 'Unit', cell: (s) => s.academicUnitName ?? '—' },
            { key: 'topics', header: 'Topics', cell: (s) => s.topicCount },
            { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              cell: (s) => (
                <RowActions
                  label={s.name}
                  onEdit={perms.can('subject.update') ? () => show({ editing: s }) : undefined}
                  onDelete={perms.can('subject.delete') ? () => show({ deleting: s }) : undefined}
                />
              ),
            },
          ]}
          testId="subject"
          rowCode={(s) => s.code}
          expandedRow={(s) =>
            editing?.id === s.id ? (
              <SubjectForm open subject={s} courses={courses} units={units} onClose={closeForm} />
            ) : deleting?.id === s.id ? (
              <InlineConfirm
                open
                testId="subject-delete"
                title="Delete this subject?"
                confirmLabel="Delete subject"
                loading={remove.isPending}
                onCancel={closeForm}
                onConfirm={() =>
                  remove.mutate(s.id, {
                    onSuccess: () => {
                      toast({ title: 'Subject deleted', variant: 'success' });
                      closeForm();
                    },
                    onError: (err) => {
                      toast({
                        title: 'Could not delete the subject',
                        description: errorText(err),
                        variant: 'error',
                      });
                      closeForm();
                    },
                  })
                }
                message={
                  <>
                    <strong>{s.name}</strong> will be removed. Subjects that still have topics or
                    questions cannot be deleted.
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
