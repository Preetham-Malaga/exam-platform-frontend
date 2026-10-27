// PURPOSE: /org/teachers - add and invite teachers, edit/deactivate/remove them and choose their scope.
// WHY: Guide Part 18 step 10. What a teacher can touch is their scope; deactivating locks the login out at once.
//      Buttons follow the caller's permissions (UX only); the API and RLS enforce every rule.
// DEPENDS ON: features/teachers/*, shared table/form/dialog components.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/feedback/Toast';
import { Checkbox, Input, Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog, Modal } from '@/components/modals/Dialog';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dropdown, type MenuItem } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { errorText } from '@/features/academic/ui';
import { Can } from '@/features/auth/Can';
import { LoginBadge } from '@/features/people/LoginBadge';
import { useTeacherMutation, useTeachers } from '@/features/teachers/hooks';
import { ScopeDrawer } from '@/features/teachers/ScopeDrawer';
import { teacherSchema, type TeacherValues } from '@/features/teachers/schemas';
import { teacherService } from '@/services/teacherService';
import type { Teacher, UpdateTeacherBody } from '@/types/teacher';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function TeacherModal({
  open,
  teacher,
  onClose,
}: {
  open: boolean;
  teacher: Teacher | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const create = useTeacherMutation((v: TeacherValues) =>
    teacherService.create({
      employeeCode: v.employeeCode,
      fullName: v.fullName,
      email: v.email || null,
      phone: v.phone || null,
      invite: v.invite,
    }),
  );
  const update = useTeacherMutation((v: { id: string; body: UpdateTeacherBody }) =>
    teacherService.update(v.id, v.body),
  );
  const form = useForm<TeacherValues>({
    resolver: zodResolver(teacherSchema),
    values: {
      employeeCode: teacher?.employeeCode ?? '',
      fullName: teacher?.fullName ?? '',
      email: teacher?.email ?? '',
      phone: teacher?.phone ?? '',
      invite: !teacher,
      status: teacher?.status ?? 'active',
    },
  });
  const close = () => {
    form.reset();
    onClose();
  };
  const onSubmit = form.handleSubmit((v) => {
    const fail = (title: string) => (e: unknown) =>
      toast({ title, description: errorText(e), variant: 'error' });
    if (teacher) {
      const body: UpdateTeacherBody = {
        employeeCode: v.employeeCode,
        fullName: v.fullName,
        phone: v.phone || null,
        status: v.status,
        // a linked teacher signs in with this address: it is shown but not editable
        ...(teacher.userId ? {} : { email: v.email || null }),
      };
      update.mutate(
        { id: teacher.id, body },
        {
          onSuccess: () => {
            toast({ title: 'Teacher updated', variant: 'success' });
            close();
          },
          onError: fail('Could not update the teacher'),
        },
      );
    } else
      create.mutate(v, {
        onSuccess: () => {
          toast({
            title: 'Teacher added',
            description: v.invite ? `An invitation was sent to ${v.email}.` : undefined,
            variant: 'success',
          });
          close();
        },
        onError: fail('Could not add the teacher'),
      });
  });
  const e = form.formState.errors;
  return (
    <Modal
      open={open}
      onClose={close}
      title={teacher ? `Edit ${teacher.fullName}` : 'Add a teacher'}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="teacher-form" loading={create.isPending || update.isPending}>
            {teacher ? 'Save' : 'Add teacher'}
          </Button>
        </>
      }
    >
      <form id="teacher-form" noValidate onSubmit={onSubmit} className="grid gap-4">
        <Input
          label="Full name"
          required
          data-autofocus
          error={e.fullName?.message}
          {...form.register('fullName')}
        />
        <Input
          label="Employee code"
          required
          hint="Unique in your organization."
          error={e.employeeCode?.message}
          {...form.register('employeeCode')}
        />
        <Input
          label="Email"
          type="email"
          disabled={Boolean(teacher?.userId)}
          hint={teacher?.userId ? 'This is the sign-in address of the teacher.' : undefined}
          error={e.email?.message}
          {...form.register('email')}
        />
        <Input label="Phone" error={e.phone?.message} {...form.register('phone')} />
        {teacher ? (
          <Select
            label="Status"
            hint="Inactive teachers cannot sign in to your organization."
            options={STATUS_OPTIONS}
            {...form.register('status')}
          />
        ) : (
          <Checkbox
            label="Send an invitation to sign in"
            description="Creates the login now. Without it you can invite the teacher later."
            {...form.register('invite')}
          />
        )}
      </form>
    </Modal>
  );
}

export default function TeachersPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'fullName', order: 'asc' });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [scoping, setScoping] = useState<Teacher | null>(null);
  const [removing, setRemoving] = useState<Teacher | null>(null);

  const q = useTeachers({
    page,
    pageSize: PAGE_SIZE,
    sort: sort.key as 'fullName' | 'employeeCode' | 'createdAt',
    order: sort.order,
    ...(search ? { search } : {}),
    ...(status ? { status: status as 'active' | 'inactive' } : {}),
  });
  const invite = useTeacherMutation((id: string) => teacherService.invite(id));
  const remove = useTeacherMutation((id: string) => teacherService.remove(id));
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const menu = (t: Teacher): MenuItem[] => {
    const items: MenuItem[] = [];
    if (perms.can('teacher.update')) items.push({ label: 'Edit', onSelect: () => setEditing(t) });
    if (perms.can('teacher.assign_scope') && t.userId)
      items.push({ label: 'Assign scope', onSelect: () => setScoping(t) });
    if (perms.can('teacher.create') && !t.userId && t.email)
      items.push({
        label: 'Send invitation',
        onSelect: () =>
          invite.mutate(t.id, {
            onSuccess: () =>
              toast({
                title: 'Invitation sent',
                description: t.email ?? undefined,
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
    if (perms.can('teacher.delete'))
      items.push({ label: 'Remove', danger: true, onSelect: () => setRemoving(t) });
    return items;
  };

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Invite teachers and choose the subjects, courses or units each one works in."
        breadcrumb={[{ label: 'People' }, { label: 'Teachers' }]}
        actions={
          <Can permission="teacher.create">
            <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => setCreating(true)}>
              Add teacher
            </Button>
          </Can>
        }
      />
      <Card padded={false}>
        <FilterBar
          canClear={Boolean(search || status)}
          onClear={() =>
            reset(() => {
              setSearch('');
              setStatus('');
            })
          }
        >
          <SearchInput
            value={search}
            onSearch={(v) => reset(() => setSearch(v))}
            placeholder="Search name, email or code"
            label="Search teachers"
          />
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
        <DataTable<Teacher>
          caption="Teachers"
          rows={q.data?.items ?? []}
          rowKey={(t) => t.id}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={(s) => reset(() => setSort(s))}
          emptyTitle={search || status ? 'No teachers match your filters' : 'No teachers yet'}
          columns={[
            {
              key: 'fullName',
              header: 'Name',
              sortable: true,
              cell: (t) => (
                <div>
                  <p className="font-medium text-text">{t.fullName}</p>
                  <p className="text-xs text-muted">{t.email ?? 'No e-mail'}</p>
                </div>
              ),
            },
            {
              key: 'employeeCode',
              header: 'Code',
              sortable: true,
              cell: (t) => <span className="font-mono text-xs">{t.employeeCode}</span>,
            },
            {
              key: 'login',
              header: 'Login',
              cell: (t) => <LoginBadge userId={t.userId} status={t.accountStatus} />,
            },
            {
              key: 'scope',
              header: 'Scope',
              cell: (t) =>
                !t.userId ? (
                  '—'
                ) : t.scopeCount === 0 ? (
                  <Badge tone="warning">Nothing assigned</Badge>
                ) : (
                  `${t.scopeCount} item${t.scopeCount === 1 ? '' : 's'}`
                ),
            },
            { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              cell: (t) => {
                const items = menu(t);
                return items.length ? (
                  <Dropdown
                    label={`Actions for ${t.fullName}`}
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

      <TeacherModal
        open={creating || Boolean(editing)}
        teacher={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <ScopeDrawer teacher={scoping} onClose={() => setScoping(null)} />
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this teacher?"
        confirmLabel="Remove teacher"
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast({ title: 'Teacher removed', variant: 'success' });
              setRemoving(null);
            },
            onError: (err) => {
              toast({
                title: 'Could not remove the teacher',
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
              <strong>{removing.fullName}</strong> loses access to your organization and their scope
              is cleared. Exams and questions they created stay.
            </>
          )
        }
      />
    </>
  );
}
