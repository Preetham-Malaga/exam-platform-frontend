// PURPOSE: /org/users and /org/admins - list organization members, change roles, suspend/reactivate, invite admins.
// WHY: Role management UI. What each person may do is decided by utils/permissions.ts (UX) and enforced by the API + database.
// DEPENDS ON: features/users/*, contexts/PermissionContext.tsx, shared table/dialog components.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { NavLink } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog, Modal } from '@/components/modals/Dialog';
import { DataTable, Pagination, type SortState } from '@/components/tables/DataTable';
import { FilterBar, SearchInput } from '@/components/tables/FilterBar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dropdown, type MenuItem } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Can } from '@/features/auth/Can';
import { useChangeRole, useChangeStatus, useInviteAdmin, useUsers } from '@/features/users/hooks';
import { inviteAdminSchema, type InviteAdminValues } from '@/features/users/schemas';
import { ApiClientError } from '@/lib/api';
import type { AssignableRole, OrgUser } from '@/types/user';
import { ROLE_LABEL, canManageUser } from '@/utils/permissions';

const PAGE_SIZE = 10;
const errorText = (e: unknown) =>
  e instanceof ApiClientError ? e.message : 'Something went wrong. Please try again.';
const ROLE_FILTER = [
  { value: 'ORGANIZATION_OWNER', label: 'Owner' },
  { value: 'ORGANIZATION_ADMIN', label: 'Admin' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'STUDENT', label: 'Student' },
];
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function InviteAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const invite = useInviteAdmin();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteAdminValues>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: { fullName: '', email: '' },
  });
  const close = () => {
    reset();
    onClose();
  };
  const onSubmit = handleSubmit((v) =>
    invite.mutate(v, {
      onSuccess: () => {
        toast({
          title: 'Admin added',
          description: `${v.email} now has admin access.`,
          variant: 'success',
        });
        close();
      },
      onError: (e) =>
        toast({ title: 'Could not add the admin', description: errorText(e), variant: 'error' }),
    }),
  );
  return (
    <Modal
      open={open}
      onClose={close}
      title="Invite an admin"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="invite-admin-form" loading={invite.isPending}>
            Send invitation
          </Button>
        </>
      }
    >
      <form id="invite-admin-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <p className="text-sm text-muted">
          Admins can manage users, content and exams, but not the organization profile.
        </p>
        <Input
          label="Full name"
          required
          data-autofocus
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="Email"
          type="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
      </form>
    </Modal>
  );
}

export default function UsersPage({ adminsOnly = false }: { adminsOnly?: boolean }) {
  const { toast } = useToast();
  const { me } = useAuth();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'fullName', order: 'asc' });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<{ user: OrgUser; role: AssignableRole } | null>(
    null,
  );
  const [pendingStatus, setPendingStatus] = useState<{
    user: OrgUser;
    status: 'active' | 'suspended';
  } | null>(null);

  const effectiveRole = adminsOnly ? 'ORGANIZATION_ADMIN' : role;
  const q = useUsers({
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(effectiveRole ? { role: effectiveRole } : {}),
    sort: sort.key as 'fullName' | 'email' | 'joinedAt',
    order: sort.order,
  });
  const changeRole = useChangeRole();
  const changeStatus = useChangeStatus();

  const rowMenu = (u: OrgUser): MenuItem[] => {
    const items: MenuItem[] = perms.assignableRoles
      .filter((r) => !u.roles.includes(r))
      .map((r) => ({
        label: `Make ${ROLE_LABEL[r]!.toLowerCase()}`,
        onSelect: () => setPendingRole({ user: u, role: r as AssignableRole }),
      }));
    items.push(
      u.status === 'suspended'
        ? { label: 'Reactivate', onSelect: () => setPendingStatus({ user: u, status: 'active' }) }
        : {
            label: 'Suspend',
            danger: true,
            onSelect: () => setPendingStatus({ user: u, status: 'suspended' }),
          },
    );
    return items;
  };

  const runRole = () =>
    pendingRole &&
    changeRole.mutate(
      { userId: pendingRole.user.userId, role: pendingRole.role },
      {
        onSuccess: () => {
          toast({
            title: 'Role changed',
            description: `${pendingRole.user.fullName || pendingRole.user.email} is now ${ROLE_LABEL[pendingRole.role]}.`,
            variant: 'success',
          });
          setPendingRole(null);
        },
        onError: (e) => {
          toast({
            title: 'Could not change the role',
            description: errorText(e),
            variant: 'error',
          });
          setPendingRole(null);
        },
      },
    );
  const runStatus = () =>
    pendingStatus &&
    changeStatus.mutate(
      { userId: pendingStatus.user.userId, status: pendingStatus.status },
      {
        onSuccess: () => {
          toast({
            title: pendingStatus.status === 'suspended' ? 'User suspended' : 'User reactivated',
            variant: 'success',
          });
          setPendingStatus(null);
        },
        onError: (e) => {
          toast({
            title: 'Could not update the user',
            description: errorText(e),
            variant: 'error',
          });
          setPendingStatus(null);
        },
      },
    );

  const data = q.data;
  const nav = (to: string, label: string) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-secondary/30 text-primary' : 'text-muted hover:bg-background'}`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <>
      <PageHeader
        title={adminsOnly ? 'Admins' : 'Users'}
        description={
          adminsOnly
            ? 'People who can manage this organization.'
            : 'Everyone with access to this organization.'
        }
        breadcrumb={[{ label: 'People' }, { label: adminsOnly ? 'Admins' : 'Users' }]}
        actions={
          <Can role="ORGANIZATION_OWNER">
            <Button leftIcon={<Icon name="plus" size={16} />} onClick={() => setInviteOpen(true)}>
              Invite admin
            </Button>
          </Can>
        }
      />
      <div className="mb-3 flex gap-1" aria-label="User views" role="group">
        {nav('/org/users', 'All users')}
        {nav('/org/admins', 'Admins')}
      </div>
      <Card padded={false}>
        <FilterBar
          canClear={Boolean(search || role)}
          onClear={() => {
            setSearch('');
            setRole('');
            setPage(1);
          }}
        >
          <SearchInput
            value={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search name or email"
            label="Search users"
          />
          {!adminsOnly && (
            <div className="w-44">
              <Select
                label="Role"
                placeholder="All roles"
                value={role}
                options={ROLE_FILTER}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}
        </FilterBar>
        <DataTable<OrgUser>
          caption={adminsOnly ? 'Organization admins' : 'Organization users'}
          rows={data?.items ?? []}
          rowKey={(u) => u.userId}
          loading={q.isPending}
          error={q.isError ? errorText(q.error) : undefined}
          onRetry={() => void q.refetch()}
          sort={sort}
          onSortChange={(s) => {
            setSort(s);
            setPage(1);
          }}
          emptyTitle={search || role ? 'No users match your filters' : 'No users yet'}
          columns={[
            {
              key: 'fullName',
              header: 'Name',
              sortable: true,
              cell: (u) => (
                <div>
                  <p className="font-medium text-text">{u.fullName || '—'}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </div>
              ),
            },
            {
              key: 'roles',
              header: 'Role',
              cell: (u) => (
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <Badge key={r} tone="info">
                      {ROLE_LABEL[r] ?? r}
                    </Badge>
                  ))}
                </div>
              ),
            },
            { key: 'status', header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
            {
              key: 'joinedAt',
              header: 'Joined',
              sortable: true,
              cell: (u) => formatDate(u.joinedAt),
            },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              cell: (u) =>
                canManageUser(
                  me ? { permissions: me.permissions, roles: me.roles } : null,
                  me?.user.id,
                  u,
                ) ? (
                  <Dropdown
                    label={`Actions for ${u.fullName || u.email}`}
                    trigger={<Icon name="more" />}
                    items={rowMenu(u)}
                  />
                ) : null,
            },
          ]}
        />
        {data && (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            pageSize={data.pagination.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>

      <InviteAdminModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ConfirmDialog
        open={Boolean(pendingRole)}
        title="Change role?"
        tone="primary"
        confirmLabel="Change role"
        loading={changeRole.isPending}
        onCancel={() => setPendingRole(null)}
        onConfirm={runRole}
        message={
          pendingRole && (
            <>
              Make <strong>{pendingRole.user.fullName || pendingRole.user.email}</strong> a{' '}
              {ROLE_LABEL[pendingRole.role]!.toLowerCase()}? Their access changes immediately.
            </>
          )
        }
      />
      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={
          pendingStatus?.status === 'suspended' ? 'Suspend this user?' : 'Reactivate this user?'
        }
        tone={pendingStatus?.status === 'suspended' ? 'danger' : 'primary'}
        confirmLabel={pendingStatus?.status === 'suspended' ? 'Suspend' : 'Reactivate'}
        loading={changeStatus.isPending}
        onCancel={() => setPendingStatus(null)}
        onConfirm={runStatus}
        message={
          pendingStatus && (
            <>
              {pendingStatus.status === 'suspended' ? (
                <>
                  <strong>{pendingStatus.user.fullName || pendingStatus.user.email}</strong> will
                  lose access to this organization right away.
                </>
              ) : (
                <>
                  <strong>{pendingStatus.user.fullName || pendingStatus.user.email}</strong> will
                  get their access back.
                </>
              )}
            </>
          )
        }
      />
    </>
  );
}
