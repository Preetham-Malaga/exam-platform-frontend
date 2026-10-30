// PURPOSE: /org/profile - view and edit organization details and branding (Phase 4).
// WHY: First real screen on the real API; shows the pattern (query, form, validation, mutation, toast) later phases follow.
// DEPENDS ON: features/organizations/*, shared UI, ToastProvider. The backend enforces organization.update / settings.update.

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { useToast } from '@/components/feedback/Toast';
import { Input, Textarea } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import {
  useOrganization,
  useUpdateBranding,
  useUpdateOrganization,
} from '@/features/organizations/hooks';
import {
  brandingFormSchema,
  organizationFormSchema,
  type BrandingFormValues,
  type OrganizationFormValues,
} from '@/features/organizations/schemas';
import { DateTimeSettings, ThemeSettings } from '@/features/organizations/SettingsTabs';
import { ApiClientError } from '@/lib/api';
import type { Organization } from '@/types/organization';

const TYPE_LABEL: Record<Organization['institutionType'], string> = {
  engineering: 'Engineering college',
  degree: 'Degree college',
  school: 'School',
  mba: 'Business school',
  coaching: 'Coaching institute',
  training: 'Training institute',
};

const errorMessage = (e: unknown) =>
  e instanceof ApiClientError ? e.message : 'Something went wrong. Please try again.';

const detailsDefaults = (org: Organization): OrganizationFormValues => ({
  name: org.name,
  contactEmail: org.contactEmail ?? '',
  contactPhone: org.contactPhone ?? '',
  address: org.address ?? '',
});

const brandingDefaults = (org: Organization): BrandingFormValues => ({
  primaryColor: org.branding.primaryColor ?? '#363B6C',
  tagline: org.branding.tagline ?? '',
});

function DetailsForm({ org }: { org: Organization }) {
  const { toast } = useToast();
  const update = useUpdateOrganization();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: detailsDefaults(org),
  });

  const onSubmit = handleSubmit((v) =>
    update.mutate(
      {
        name: v.name,
        contactEmail: v.contactEmail || null,
        contactPhone: v.contactPhone || null,
        address: v.address || null,
      },
      {
        // After a successful save, the saved values become the new baseline, so "Save" is disabled again.
        onSuccess: () => {
          reset(v);
          toast({ title: 'Organization updated', variant: 'success' });
        },
        onError: (e) =>
          toast({ title: 'Could not save', description: errorMessage(e), variant: 'error' }),
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-2xl gap-4">
      <Input
        label="Organization name"
        required
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Contact email"
          type="email"
          error={errors.contactEmail?.message}
          {...register('contactEmail')}
        />
        <Input
          label="Contact phone"
          error={errors.contactPhone?.message}
          {...register('contactPhone')}
        />
      </div>
      <Textarea label="Address" rows={3} error={errors.address?.message} {...register('address')} />
      <div>
        <Button type="submit" loading={update.isPending} disabled={!isDirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function BrandingForm({ org }: { org: Organization }) {
  const { toast } = useToast();
  const update = useUpdateBranding();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: brandingDefaults(org),
  });

  const onSubmit = handleSubmit((v) =>
    update.mutate(
      { branding: { primaryColor: v.primaryColor, ...(v.tagline ? { tagline: v.tagline } : {}) } },
      {
        onSuccess: () => {
          reset(v);
          toast({ title: 'Branding saved', variant: 'success' });
        },
        onError: (e) =>
          toast({ title: 'Could not save', description: errorMessage(e), variant: 'error' }),
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-2xl gap-4">
      <Input
        label="Primary colour"
        hint="Hex value, e.g. #363B6C"
        error={errors.primaryColor?.message}
        {...register('primaryColor')}
      />
      <Input label="Tagline" error={errors.tagline?.message} {...register('tagline')} />
      <div>
        <Button type="submit" loading={update.isPending} disabled={!isDirty}>
          Save branding
        </Button>
      </div>
    </form>
  );
}

export default function OrganizationProfilePage() {
  const [tab, setTab] = useState('details');
  const q = useOrganization();
  if (q.isPending) return <LoadingState />;
  if (q.isError)
    return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const org = q.data;
  return (
    <>
      <PageHeader
        title="Organization Profile"
        description="Details, branding and date settings for your institution."
        breadcrumb={[{ label: 'Settings' }, { label: 'Organization Profile' }]}
      />
      <Card className="mb-5">
        <dl className="grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Organization code</dt>
            <dd className="font-mono text-sm font-semibold text-text">{org.orgCode}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Institution type</dt>
            <dd className="text-sm text-text">{TYPE_LABEL[org.institutionType]}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Status</dt>
            <dd>
              <StatusBadge status={org.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Timezone</dt>
            <dd className="text-sm text-text">{org.timezone}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <Tabs
          label="Organization settings"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'details', label: 'Details', content: <DetailsForm org={org} /> },
            {
              id: 'branding',
              label: 'Branding',
              content: (
                <div className="flex flex-col gap-6">
                  <ThemeSettings org={org} />
                  <BrandingForm org={org} />
                </div>
              ),
            },
            { id: 'datetime', label: 'Date & time', content: <DateTimeSettings org={org} /> },
          ]}
        />
      </Card>
    </>
  );
}
