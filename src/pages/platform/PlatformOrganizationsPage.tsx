// PURPOSE: /platform/organizations - platform staff see organizations (those waiting first) and approve them.
// WHY: New organizations wait for approval after e-mail verification (backend migration 043). Approve asks for
//      confirmation in the row (no pop-up); the API checks again that the caller is platform staff.
// DEPENDS ON: lib/api.ts, TanStack Query, shared table / inline components.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '@/components/feedback/Toast';
import { InlineConfirm } from '@/components/inline/Inline';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { DataTable } from '@/components/tables/DataTable';
import { AccessDenied } from '@/components/feedback/AccessDenied';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiClientError } from '@/lib/api';
import { API_PREFIX } from '@/lib/constants';

interface PlatformOrg {
  id: string;
  orgCode: string;
  name: string;
  institutionType: string;
  status: string;
  city: string | null;
  state: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  ownerName: string | null;
  createdAt: string;
}

const key = ['platform', 'organizations'] as const;

export default function PlatformOrganizationsPage() {
  const { me } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending_approval' | 'all'>('pending_approval');
  const [approving, setApproving] = useState<PlatformOrg | null>(null);
  const q = useQuery({
    queryKey: [...key, tab],
    queryFn: () =>
      api.get<{ items: PlatformOrg[] }>(
        `${API_PREFIX}/platform/organizations${tab === 'all' ? '' : `?status=${tab}`}`,
      ),
    enabled: Boolean(me?.isPlatformAdmin),
  });
  const approve = useMutation({
    mutationFn: (id: string) => api.post(`${API_PREFIX}/platform/organizations/${id}/approve`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });
  if (!me?.isPlatformAdmin) return <AccessDenied />;

  return (
    <PageRoot
      testId="page-platform-organizations"
      ready={!q.isPending}
      className="flex flex-col gap-[18px]"
    >
      <PageHeader
        title="Organizations"
        description="New organizations wait here after verifying their e-mail. Approve them so their people can sign in."
        breadcrumb={[{ label: 'Platform' }, { label: 'Organizations' }]}
      />
      <Tabs
        label="Which organizations"
        testId="platform-organizations"
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'pending_approval', label: 'Waiting for approval' },
          { id: 'all', label: 'All' },
        ]}
      />
      <Card padded={false}>
        <DataTable<PlatformOrg>
          caption="Organizations"
          testId="platform-organization"
          rows={q.data?.items ?? []}
          rowKey={(o) => o.id}
          rowCode={(o) => o.orgCode}
          loading={q.isPending}
          error={q.isError ? (q.error as Error).message : undefined}
          onRetry={() => void q.refetch()}
          emptyTitle={tab === 'all' ? 'No organizations yet' : 'Nobody is waiting for approval'}
          columns={[
            {
              key: 'name',
              header: 'Organization',
              cell: (o) => (
                <div>
                  <b className="block">{o.name}</b>
                  <span className="text-xs text-muted">
                    {o.orgCode} · {o.institutionType}
                    {o.city ? ` · ${o.city}${o.state ? `, ${o.state}` : ''}` : ''}
                  </span>
                </div>
              ),
            },
            {
              key: 'owner',
              header: 'Owner',
              cell: (o) => (
                <div>
                  <b className="block">{o.ownerName || '—'}</b>
                  <span className="text-xs text-muted">
                    {o.contactEmail ?? '—'}
                    {o.contactPhone ? ` · ${o.contactPhone}` : ''}
                  </span>
                </div>
              ),
            },
            { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              cell: (o) =>
                o.status === 'pending_approval' || o.status === 'pending_email' ? (
                  <Button
                    size="sm"
                    onClick={() => setApproving(o)}
                    data-testid="platform-organization-row-approve-btn"
                  >
                    Approve
                  </Button>
                ) : null,
            },
          ]}
          expandedRow={(o) =>
            approving?.id === o.id ? (
              <InlineConfirm
                open
                tone="primary"
                testId="platform-organization-approve"
                title={`Approve ${o.name}?`}
                confirmLabel="Approve"
                loading={approve.isPending}
                onCancel={() => setApproving(null)}
                onConfirm={() =>
                  approve.mutate(o.id, {
                    onSuccess: () => {
                      toast({
                        title: `${o.name} approved`,
                        description: 'Its people can sign in now.',
                        variant: 'success',
                      });
                      setApproving(null);
                    },
                    onError: (e) => {
                      toast({
                        title: 'Could not approve',
                        description: e instanceof ApiClientError ? e.message : 'Please try again.',
                        variant: 'error',
                      });
                      setApproving(null);
                    },
                  })
                }
                message={
                  o.status === 'pending_email'
                    ? 'The owner has not verified their e-mail yet. Approving makes the organization active now.'
                    : 'The organization becomes active and its owner can start setting it up.'
                }
              />
            ) : null
          }
        />
      </Card>
    </PageRoot>
  );
}
