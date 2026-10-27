// PURPOSE: /org/courses - list, search, filter, create, edit and delete courses (programs), optionally placed on a unit.
// WHY: Courses group subjects. Buttons follow the caller's permissions (UX); the API and RLS decide what really happens.
// DEPENDS ON: features/academic/*, shared table/form/dialog components.

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select, Textarea } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog, Modal } from '@/components/modals/Dialog';
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

function CourseModal({
  open,
  course,
  units,
  onClose,
}: {
  open: boolean;
  course: Course | null;
  units: Array<{ value: string; label: string }>;
  onClose: () => void;
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
    <Modal
      open={open}
      onClose={close}
      title={course ? `Edit ${course.name}` : 'New course'}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="course-form" loading={create.isPending || update.isPending}>
            {course ? 'Save' : 'Create course'}
          </Button>
        </>
      }
    >
      <form id="course-form" noValidate onSubmit={onSubmit} className="grid gap-4">
        <Input
          label="Name"
          required
          data-autofocus
          placeholder="e.g. B.Tech"
          error={e.name?.message}
          {...form.register('name')}
        />
        <Input
          label="Code"
          required
          placeholder="e.g. BTECH"
          hint="Unique in your organization."
          error={e.code?.message}
          {...form.register('code')}
        />
        <Select
          label="Academic unit"
          placeholder="No unit"
          options={units}
          {...form.register('academicUnitId')}
        />
        <Textarea
          label="Description"
          rows={3}
          error={e.description?.message}
          {...form.register('description')}
        />
        {course && <Select label="Status" options={STATUS_OPTIONS} {...form.register('status')} />}
      </form>
    </Modal>
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

  return (
    <>
      <PageHeader
        title="Courses"
        description="Programs and courses offered by your organization."
        breadcrumb={[{ label: 'Content Management' }, { label: 'Courses' }]}
        actions={
          <Can permission="course.create">
            <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => setCreating(true)}>
              New course
            </Button>
          </Can>
        }
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
                  onEdit={perms.can('course.update') ? () => setEditing(c) : undefined}
                  onDelete={perms.can('course.delete') ? () => setDeleting(c) : undefined}
                />
              ),
            },
          ]}
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

      <CourseModal
        open={creating || Boolean(editing)}
        course={editing}
        units={units}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this course?"
        confirmLabel="Delete course"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast({ title: 'Course deleted', variant: 'success' });
              setDeleting(null);
            },
            onError: (err) => {
              toast({
                title: 'Could not delete the course',
                description: errorText(err),
                variant: 'error',
              });
              setDeleting(null);
            },
          })
        }
        message={
          deleting && (
            <>
              <strong>{deleting.name}</strong> will be removed. Courses that still have subjects
              cannot be deleted.
            </>
          )
        }
      />
    </>
  );
}
