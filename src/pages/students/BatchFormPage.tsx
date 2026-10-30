// PURPOSE: /org/batches/new and /org/batches/:batchId/edit - the full batch form (prototype SPEC.batch) on its own page.
// WHY: Add and edit never open a pop-up. The code is suggested from the name until the user edits it.
// DEPENDS ON: components/forms/FormPage.tsx, features/batches/batches.ts, academic and teacher hooks for the pickers.

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select } from '@/components/forms/Form';
import { ChoicePills, FormPage, FormSection } from '@/components/forms/FormPage';
import { useCatalogTree } from '@/features/academic/hooks';
import { errorText } from '@/features/academic/ui';
import {
  ACADEMIC_YEARS,
  MODES,
  TIMINGS,
  YEAR_SEMS,
  batchBodyFrom,
  batchFormFrom,
  batchFormSchema,
  batchService,
  useBatch,
  useBatchMutation,
  type BatchFormValues,
} from '@/features/batches/batches';
import { useTeachers } from '@/features/teachers/hooks';
import { ApiClientError } from '@/lib/api';
import { autoCode } from '@/utils/autoCode';

const P = 'batch-form';
const opts = (a: readonly string[]) => a.map((v) => ({ value: v, label: v }));
const LABELS: Record<keyof BatchFormValues, string> = {
  name: 'Batch name',
  code: 'Batch code',
  courseId: 'Course',
  academicYear: 'Academic year',
  yearSem: 'Year / semester',
  section: 'Section',
  mode: 'Mode',
  timing: 'Timing',
  startDate: 'Start date',
  endDate: 'End date',
  capacity: 'Capacity (students)',
  classTeacherId: 'Class teacher / mentor',
  room: 'Room / classroom',
  status: 'Status',
};
const ORDER = Object.keys(LABELS) as Array<keyof BatchFormValues>;

export default function BatchFormPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tree = useCatalogTree();
  const teachers = useTeachers({ page: 1, pageSize: 100 });
  const existing = useBatch(batchId);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: batchFormFrom(),
  });
  const { register, control, setValue, setFocus, setError, formState } = form;
  useEffect(() => {
    if (existing.data && tree.data && teachers.data) form.reset(batchFormFrom(existing.data));
  }, [existing.data, tree.data, teachers.data, form]);
  const name = useWatch({ control, name: 'name' });
  useEffect(() => {
    if (!batchId && !form.getFieldState('code').isDirty) setValue('code', autoCode(name ?? ''));
  }, [name, setValue, form, batchId]);

  const save = useBatchMutation((v: BatchFormValues) =>
    batchId
      ? batchService.update(batchId, batchBodyFrom(v))
      : batchService.create(batchBodyFrom(v)),
  );
  const onSubmit = form.handleSubmit(
    (v) => {
      setServerError(null);
      save.mutate(v, {
        onSuccess: (b) => {
          toast({ title: `Batch ${b.name} ${batchId ? 'saved' : 'added'}`, variant: 'success' });
          navigate('/org/batches');
        },
        onError: (e) => {
          if (e instanceof ApiClientError && e.field && e.field in LABELS)
            setError(
              e.field as keyof BatchFormValues,
              { message: e.message },
              { shouldFocus: true },
            );
          else setServerError(errorText(e));
        },
      });
    },
    (errs) => {
      const first = ORDER.find((k) => errs[k]);
      if (first) setFocus(first);
      const n = Object.keys(errs).length;
      toast({ title: `Fix ${n} ${n === 1 ? 'field' : 'fields'} before saving`, variant: 'error' });
    },
  );
  const e = formState.errors;
  const title = batchId ? 'Edit batch' : 'New batch';
  return (
    <FormPage
      prefix={P}
      pageId="page-form-batch"
      ready={!tree.isPending && (!batchId || !existing.isPending)}
      breadcrumb={[{ label: 'Batches', to: '/org/batches' }, { label: title }]}
      title={title}
      errors={formState.submitCount > 0 ? ORDER.filter((k) => e[k]).map((k) => [k, LABELS[k]]) : []}
      onFocusField={(k) => setFocus(k as keyof BatchFormValues)}
      onSubmit={onSubmit}
      fieldCount={ORDER.length}
      cancelTo="/org/batches"
      saveLabel={batchId ? 'Save changes' : 'Save batch'}
      saving={save.isPending}
      serverError={existing.isError ? errorText(existing.error) : serverError}
    >
      <FormSection prefix={P} title="Basics">
        <Input
          label="Batch name"
          required
          placeholder="e.g. B.Tech 2026 · Sec C"
          className="col-span-full sm:col-span-2"
          error={e.name?.message}
          data-testid={`${P}-name-input`}
          {...register('name')}
        />
        <Input
          label="Batch code"
          required
          placeholder="BT26C"
          hint="Suggested from the name."
          className="[&_input]:font-extrabold [&_input]:uppercase"
          error={e.code?.message}
          data-testid={`${P}-code-input`}
          {...register('code')}
        />
        <Select
          label="Course"
          required
          placeholder="Choose…"
          options={(tree.data?.courses ?? []).map((c) => ({ value: c.id, label: c.name }))}
          error={e.courseId?.message}
          data-testid={`${P}-course-select`}
          {...register('courseId')}
        />
        <Select
          label="Academic year"
          required
          options={opts(ACADEMIC_YEARS)}
          error={e.academicYear?.message}
          data-testid={`${P}-academic-year-select`}
          {...register('academicYear')}
        />
        <Select
          label="Year / semester"
          placeholder="Choose…"
          options={opts(YEAR_SEMS)}
          data-testid={`${P}-year-sem-select`}
          {...register('yearSem')}
        />
        <Input
          label="Section"
          placeholder="e.g. C"
          error={e.section?.message}
          data-testid={`${P}-section-input`}
          {...register('section')}
        />
        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <ChoicePills
              label="Mode"
              value={field.value}
              options={MODES}
              onChange={field.onChange}
              testId={`${P}-mode-radio`}
            />
          )}
        />
        <Select
          label="Timing"
          placeholder="Choose…"
          options={opts(TIMINGS)}
          data-testid={`${P}-timing-select`}
          {...register('timing')}
        />
      </FormSection>
      <FormSection prefix={P} title="Dates, capacity & staff">
        <Input
          label="Start date"
          type="date"
          required
          error={e.startDate?.message}
          data-testid={`${P}-start-date-input`}
          {...register('startDate')}
        />
        <Input
          label="End date"
          type="date"
          error={e.endDate?.message}
          data-testid={`${P}-end-date-input`}
          {...register('endDate')}
        />
        <Input
          label="Capacity (students)"
          inputMode="numeric"
          error={e.capacity?.message}
          data-testid={`${P}-capacity-input`}
          {...register('capacity')}
        />
        <Select
          label="Class teacher / mentor"
          placeholder="None"
          options={(teachers.data?.items ?? []).map((t) => ({ value: t.id, label: t.fullName }))}
          data-testid={`${P}-class-teacher-select`}
          {...register('classTeacherId')}
        />
        <Input
          label="Room / classroom"
          placeholder="e.g. Block B · 204"
          error={e.room?.message}
          data-testid={`${P}-room-input`}
          {...register('room')}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <ChoicePills
              label="Status"
              required
              value={field.value}
              options={['Active', 'Inactive']}
              onChange={field.onChange}
              testId={`${P}-status-radio`}
            />
          )}
        />
      </FormSection>
    </FormPage>
  );
}
