// PURPOSE: /org/students - list students by unit, add/edit/move, invite, deactivate, remove, and import from CSV.
// WHY: Guide Part 18 step 11. A student's unit decides which exams reach them. Buttons follow the caller's
//      permissions (UX only); the API and RLS enforce every rule.
// DEPENDS ON: features/students/*, features/academic (unit tree), shared table/form/dialog components.

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/feedback/Toast';
import { Checkbox, Input, Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog, Modal } from '@/components/modals/Dialog';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dropdown, type MenuItem } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { useUnitTree } from '@/features/academic/hooks';
import { unitOptions } from '@/features/academic/tree';
import { errorText } from '@/features/academic/ui';
import { Can } from '@/features/auth/Can';
import { LoginBadge } from '@/features/people/LoginBadge';
import { useStudentMutation, useStudents } from '@/features/students/hooks';
import { ImportModal } from '@/features/students/ImportModal';
import { studentSchema, type StudentValues } from '@/features/students/schemas';
import { studentService } from '@/services/studentService';
import type { Student, UpdateStudentBody } from '@/types/student';

const PAGE_SIZE = 10;
const UNPLACED = '__unplaced';
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];
type Option = { value: string; label: string };

function StudentModal({
  open,
  student,
  units,
  onClose,
}: {
  open: boolean;
  student: Student | null;
  units: Option[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const create = useStudentMutation((v: StudentValues) =>
    studentService.create({
      rollNumber: v.rollNumber,
      fullName: v.fullName,
      email: v.email || null,
      phone: v.phone || null,
      academicUnitId: v.academicUnitId || null,
      invite: v.invite,
    }),
  );
  const update = useStudentMutation((v: { id: string; body: UpdateStudentBody }) =>
    studentService.update(v.id, v.body),
  );
  const form = useForm<StudentValues>({
    resolver: zodResolver(studentSchema),
    values: {
      rollNumber: student?.rollNumber ?? '',
      fullName: student?.fullName ?? '',
      email: student?.email ?? '',
      phone: student?.phone ?? '',
      academicUnitId: student?.academicUnitId ?? '',
      invite: false,
      status: student?.status ?? 'active',
    },
  });
  const close = () => {
    form.reset();
    onClose();
  };
  const onSubmit = form.handleSubmit((v) => {
    const fail = (title: string) => (e: unknown) =>
      toast({ title, description: errorText(e), variant: 'error' });
    if (student)
      update.mutate(
        {
          id: student.id,
          body: {
            rollNumber: v.rollNumber,
            fullName: v.fullName,
            phone: v.phone || null,
            academicUnitId: v.academicUnitId || null,
            status: v.status,
            // a linked student signs in with this address: it is shown but not editable
            ...(student.userId ? {} : { email: v.email || null }),
          },
        },
        {
          onSuccess: () => {
            toast({ title: 'Student updated', variant: 'success' });
            close();
          },
          onError: fail('Could not update the student'),
        },
      );
    else
      create.mutate(v, {
        onSuccess: () => {
          toast({
            title: 'Student added',
            description: v.invite ? `An invitation was sent to ${v.email}.` : undefined,
            variant: 'success',
          });
          close();
        },
        onError: fail('Could not add the student'),
      });
  });
  const e = form.formState.errors;
  return (
    <Modal
      open={open}
      onClose={close}
      title={student ? `Edit ${student.fullName}` : 'Add a student'}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="student-form" loading={create.isPending || update.isPending}>
            {student ? 'Save' : 'Add student'}
          </Button>
        </>
      }
    >
      <form id="student-form" noValidate onSubmit={onSubmit} className="grid gap-4">
        <Input
          label="Full name"
          required
          data-autofocus
          error={e.fullName?.message}
          {...form.register('fullName')}
        />
        <Input
          label="Roll number"
          required
          hint="Unique in your organization."
          error={e.rollNumber?.message}
          {...form.register('rollNumber')}
        />
        <Select
          label="Academic unit"
          placeholder="Not placed yet"
          hint="Exams assigned to this unit (or a unit above it) reach the student."
          options={units}
          {...form.register('academicUnitId')}
        />
        <Input
          label="Email"
          type="email"
          disabled={Boolean(student?.userId)}
          hint={student?.userId ? 'This is the sign-in address of the student.' : undefined}
          error={e.email?.message}
          {...form.register('email')}
        />
        <Input label="Phone" error={e.phone?.message} {...form.register('phone')} />
        {student ? (
          <Select
            label="Status"
            hint="Inactive students cannot sign in to your organization."
            options={STATUS_OPTIONS}
            {...form.register('status')}
          />
        ) : (
          <Checkbox
            label="Send an invitation to sign in"
            description="You can also invite students later from the list."
            {...form.register('invite')}
          />
        )}
      </form>
    </Modal>
  );
}

export default function StudentsPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'rollNumber', order: 'asc' });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [removing, setRemoving] = useState<Student | null>(null);
  const [importing, setImporting] = useState(false);

  const tree = useUnitTree();
  const units = useMemo(() => unitOptions(tree.data?.units ?? []), [tree.data]);
  const q = useStudents({
    page,
    pageSize: PAGE_SIZE,
    sort: sort.key as 'rollNumber' | 'fullName' | 'createdAt',
    order: sort.order,
    ...(search ? { search } : {}),
    ...(status ? { status: status as 'active' | 'inactive' } : {}),
    ...(unit === UNPLACED ? { unplaced: true } : unit ? { academicUnitId: unit } : {}),
  });
  const invite = useStudentMutation((id: string) => studentService.invite(id));
  const remove = useStudentMutation((id: string) => studentService.remove(id));
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const menu = (s: Student): MenuItem[] => {
    const items: MenuItem[] = [];
    if (perms.can('student.update')) items.push({ label: 'Edit', onSelect: () => setEditing(s) });
    if (perms.can('student.create') && !s.userId && s.email)
      items.push({
        label: 'Send invitation',
        onSelect: () =>
          invite.mutate(s.id, {
            onSuccess: () =>
              toast({
                title: 'Invitation sent',
                description: s.email ?? undefined,
                variant: 'success',
              }),
            onError: (e) =>
              toast({
                title: 'Could not send the invitation',
                description: errorText(e),
                variant: 'error',
              }),
          }),
      });
    if (perms.can('student.delete'))
      items.push({ label: 'Remove', danger: true, onSelect: () => setRemoving(s) });
    return items;
  };

  return (
    <>
      <PageHeader
        title="Students"
        description="Place students on academic units: exams assigned to a unit reach every student in it."
        breadcrumb={[{ label: 'People' }, { label: 'Students' }]}
        actions={
          <>
            <Can permission="student.import">
              <Button
                variant="outline"
                leftIcon={<Icon name="file" size={16} />}
                onClick={() => setImporting(true)}
              >
                Import CSV
              </Button>
            </Can>
            <Can permission="student.create">
              <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => setCreating(true)}>
                Add student
              </Button>
            </Can>
          </>
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
            placeholder="Search name, roll no. or email"
            label="Search students"
          />
          <div className="w-60">
            <Select
              label="Unit"
              placeholder="All units"
              value={unit}
              options={[{ value: UNPLACED, label: 'Not placed yet' }, ...units]}
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
        <DataTable<Student>
          caption="Students"
          rows={q.data?.items ?? []}
          rowKey={(s) => s.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={(s) => reset(() => setSort(s))}
          emptyTitle={
            search || unit || status ? 'No students match your filters' : 'No students yet'
          }
          columns={[
            {
              key: 'rollNumber',
              header: 'Roll no.',
              sortable: true,
              cell: (s) => <span className="font-mono text-xs">{s.rollNumber}</span>,
            },
            {
              key: 'fullName',
              header: 'Name',
              sortable: true,
              cell: (s) => (
                <div>
                  <p className="font-medium text-text">{s.fullName}</p>
                  <p className="text-xs text-muted">{s.email ?? 'No e-mail'}</p>
                </div>
              ),
            },
            { key: 'unit', header: 'Unit', cell: (s) => s.academicUnitName ?? '—' },
            {
              key: 'login',
              header: 'Login',
              cell: (s) => <LoginBadge userId={s.userId} status={s.accountStatus} />,
            },
            { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              cell: (s) => {
                const items = menu(s);
                return items.length ? (
                  <Dropdown
                    label={`Actions for ${s.fullName}`}
                    trigger={<Icon name="more" />}
                    items={items}
                  />
                ) : null;
              },
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

      <StudentModal
        open={creating || Boolean(editing)}
        student={editing}
        units={units}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <ImportModal open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this student?"
        confirmLabel="Remove student"
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast({ title: 'Student removed', variant: 'success' });
              setRemoving(null);
            },
            onError: (err) => {
              toast({
                title: 'Could not remove the student',
                description: errorText(err),
                variant: 'error',
              });
              setRemoving(null);
            },
          })
        }
        message={
          removing && (
            <>
              <strong>{removing.fullName}</strong> loses access to your organization. Their exam
              attempts and results are kept for reports.
            </>
          )
        }
      />
    </>
  );
}
