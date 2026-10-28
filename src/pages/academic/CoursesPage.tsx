// PURPOSE: /org/courses - list, search, filter, create, edit and delete courses (programs), optionally placed on a unit.
// WHY: Courses group subjects. Buttons follow the caller's permissions (UX); the API and RLS decide what really happens.
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
import { useAcademicMutation, useCourses, useUnitTree } from '@/features/academic/hooks';
import { courseSchema, orNull, type CourseValues } from '@/features/academic/schemas';
import { unitOptions } from '@/features/academic/tree';
import { RowActions, errorText } from '@/features/academic/ui';
import { academicService } from '@/services/academicService';
import type { ActiveStatus, Course } from '@/types/academic';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/** Add form (above the list) or edit form (under the course's row). */
function CourseForm({
  open,
  course,
  units,
  onClose,
  className,
}: {
  open: boolean;
  course: Course | null;
  units: Array<{ value: string; label: string }>;
  onClose: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const create = useAcademicMutation((v: CourseValues) =>
    academicService.createCourse({
      code: v.code,
      name: v.name,
      description: orNull(v.description),
      academicUnitId: orNull(v.academicUnitId),
    }),
  );
  const update = useAcademicMutation((v: CourseValues & { id: string }) =>
    academicService.updateCourse(v.id, {
      code: v.code,
      name: v.name,
      description: orNull(v.description),
      academicUnitId: orNull(v.academicUnitId),
      status: v.status,
    }),
  );
  const form = useForm<CourseValues>({
    resolver: zodResolver(courseSchema),
    values: {
      code: course?.code ?? '',
      name: course?.name ?? '',
      description: course?.description ?? '',
      academicUnitId: course?.academicUnitId ?? '',
      status: course?.status ?? 'active',
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
    if (course)
      update.mutate(
        { ...v, id: course.id },
        { onSuccess: done('Course updated'), onError: fail('Could not update the course') },
      );
    else
      create.mutate(v, {
        onSuccess: done('Course created'),
        onError: fail('Could not create the course'),
      });
  });
  const e = form.formState.errors;
  return (
    <InlinePanel
      open={open}
      onClose={close}
      title={course ? `Edit ${course.name}` : 'New course'}
      testId="course-form"
      {...(className ? { className } : {})}
      footer={
        <>
          <Button variant="outline" onClick={close} data-testid="course-form-cancel-btn">
            Cancel
          </Button>
          <Button
            type="submit"
            form="course-form"
            loading={create.isPending || update.isPending}
            data-testid="course-form-save-btn"
          >
            {course ? 'Save' : 'Create course'}
          </Button>
        </>
      }
    >
      <form id="course-form" noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          required
          data-autofocus
          placeholder="e.g. B.Tech"
          error={e.name?.message}
          data-testid="course-form-name-input"
          {...form.register('name')}
        />
        <Input
          label="Code"
          required
          placeholder="e.g. BTECH"
          hint="Unique in your organization."
          error={e.code?.message}
          data-testid="course-form-code-input"
          {...form.register('code')}
        />
        <Select
          label="Academic unit"
          placeholder="No unit"
          options={units}
          data-testid="course-form-unit-select"
          {...form.register('academicUnitId')}
        />
        {course && (
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            data-testid="course-form-status-select"
            {...form.register('status')}
          />
        )}
        <Textarea
          label="Description"
          rows={3}
          className="sm:col-span-2"
          error={e.description?.message}
          data-testid="course-form-description-textarea"
          {...form.register('description')}
        />
      </form>
    </InlinePanel>
  );
}

export default function CoursesPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'code', order: 'asc' });
  const [editing, setEditing] = useState<Course | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Course | null>(null);

  const tree = useUnitTree();
  const units = useMemo(() => unitOptions(tree.data?.units ?? []), [tree.data]);
  const q = useCourses({
    page,
    pageSize: PAGE_SIZE,
    sort: sort.key,
    order: sort.order,
    ...(search ? { search } : {}),
    ...(unit ? { academicUnitId: unit } : {}),
    ...(status ? { status: status as ActiveStatus } : {}),
  });
  const remove = useAcademicMutation((id: string) => academicService.deleteCourse(id));
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };
  // One inline form or confirmation at a time.
  const show = (next: { creating?: boolean; editing?: Course; deleting?: Course }) => {
    setCreating(Boolean(next.creating));
    setEditing(next.editing ?? null);
    setDeleting(next.deleting ?? null);
  };
  const closeForm = () => show({});

  return (
    <>
      <PageHeader
        title="Courses"
        description="Programs and courses offered by your organization."
        breadcrumb={[{ label: 'Content Management' }, { label: 'Courses' }]}
        actions={
          <Can permission="course.create">
            <Button
              leftIcon={<Icon name="plus" size={16} />}
              onClick={() => show({ creating: true })}
              data-testid="courses-add-btn"
            >
              New course
            </Button>
          </Can>
        }
      />
      <CourseForm
        open={creating}
        course={null}
        units={units}
        onClose={closeForm}
        className="mb-4"
      />
      <Card padded={false}>
        <FilterBar
          canClear={Boolean(search || unit || status)}
          onClear={() =>
            reset(() => {
              setSearch('');
              setUnit('');
              setStatus('');
            })
          }
        >
          <SearchInput
            value={search}
            onSearch={(v) => reset(() => setSearch(v))}
            placeholder="Search name or code"
            label="Search courses"
          />
          <div className="w-56">
            <Select
              label="Unit"
              placeholder="All units"
              value={unit}
              options={units}
              onChange={(ev) => reset(() => setUnit(ev.target.value))}
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
        <DataTable<Course>
          caption="Courses"
          rows={q.data?.items ?? []}
          rowKey={(c) => c.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={(s) => reset(() => setSort(s))}
          emptyTitle={search || unit || status ? 'No courses match your filters' : 'No courses yet'}
          columns={[
            {
              key: 'code',
              header: 'Code',
              sortable: true,
              cell: (c) => <span className="font-mono text-xs">{c.code}</span>,
            },
            {
              key: 'name',
              header: 'Name',
              sortable: true,
              cell: (c) => (
                <div>
                  <p className="font-medium text-text">{c.name}</p>
                  {c.description && (
                    <p className="line-clamp-1 text-xs text-muted">{c.description}</p>
                  )}
                </div>
              ),
            },
            { key: 'unit', header: 'Unit', cell: (c) => c.academicUnitName ?? '—' },
            { key: 'subjects', header: 'Subjects', cell: (c) => c.subjectCount },
            { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              cell: (c) => (
                <RowActions
                  label={c.name}
                  onEdit={perms.can('course.update') ? () => show({ editing: c }) : undefined}
                  onDelete={perms.can('course.delete') ? () => show({ deleting: c }) : undefined}
                />
              ),
            },
          ]}
          testId="course"
          rowCode={(c) => c.code}
          expandedRow={(c) =>
            editing?.id === c.id ? (
              <CourseForm open course={c} units={units} onClose={closeForm} />
            ) : deleting?.id === c.id ? (
              <InlineConfirm
                open
                testId="course-delete"
                title="Delete this course?"
                confirmLabel="Delete course"
                loading={remove.isPending}
                onCancel={closeForm}
                onConfirm={() =>
                  remove.mutate(c.id, {
                    onSuccess: () => {
                      toast({ title: 'Course deleted', variant: 'success' });
                      closeForm();
                    },
                    onError: (err) => {
                      toast({
                        title: 'Could not delete the course',
                        description: errorText(err),
                        variant: 'error',
                      });
                      closeForm();
                    },
                  })
                }
                message={
                  <>
                    <strong>{c.name}</strong> will be removed. Courses that still have subjects
                    cannot be deleted.
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
