// PURPOSE: /org/courses/new and /org/courses/:courseId/edit - the full course form (prototype SPEC.course) on its own page.
// WHY: Add and edit never open a pop-up. The code is suggested from the name until the user types one; extra fields are
//      kept in the course's "details" (migration 044). The cover image waits for file storage (Learning step).
// DEPENDS ON: components/forms/FormPage.tsx, features/academic/forms.ts, services/academicService.ts.

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select, Textarea } from '@/components/forms/Form';
import { ChoicePills, FormPage, FormSection } from '@/components/forms/FormPage';
import { useAcademicMutation, useCourse } from '@/features/academic/hooks';
import {
  COURSE_TYPES,
  DURATION_UNITS,
  LANGUAGES,
  STATUS_PILLS,
  courseDetailsFrom,
  courseFormFrom,
  courseFormSchema,
  toOptions,
  type CourseFormValues,
} from '@/features/academic/forms';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { ApiClientError } from '@/lib/api';
import { academicService } from '@/services/academicService';
import { autoCode } from '@/utils/autoCode';

const P = 'course-form';
const LABELS: Record<keyof CourseFormValues, string> = {
  name: 'Course name',
  code: 'Course code',
  courseType: 'Course type',
  department: 'Department',
  medium: 'Medium of instruction',
  description: 'Description',
  durationValue: 'Duration',
  durationUnit: 'Duration unit',
  terms: 'Number of semesters / terms',
  startDate: 'Start date',
  endDate: 'End date',
  seats: 'Seats / intake',
  fee: 'Total fee (₹)',
  status: 'Status',
};
const ORDER = Object.keys(LABELS) as Array<keyof CourseFormValues>;

export default function CourseFormPage() {
  const { courseId } = useParams();
  const base = useAreaBase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const existing = useCourse(courseId);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      status: 'Active',
      ...courseFormFrom(),
    },
  });
  const { register, control, setValue, setFocus, setError, formState } = form;
  const c = existing.data;
  useEffect(() => {
    if (c)
      form.reset({
        name: c.name,
        code: c.code,
        description: c.description ?? '',
        status: c.status === 'active' ? 'Active' : 'Inactive',
        ...courseFormFrom(c.details),
      });
  }, [c, form]);

  const name = useWatch({ control, name: 'name' });
  useEffect(() => {
    // The code follows the name until the user edits the code (then the field is "dirty").
    if (!courseId && !form.getFieldState('code').isDirty) setValue('code', autoCode(name ?? ''));
  }, [name, setValue, form, courseId]);

  const save = useAcademicMutation(async (v: CourseFormValues) => {
    const body = {
      code: v.code.toUpperCase(),
      name: v.name,
      description: v.description.trim() || null,
      details: courseDetailsFrom(v),
    };
    const status = v.status === 'Active' ? ('active' as const) : ('inactive' as const);
    if (courseId) return academicService.updateCourse(courseId, { ...body, status });
    const created = await academicService.createCourse(body);
    // New courses start active; an "Inactive" choice is applied right after.
    return status === 'inactive' ? academicService.updateCourse(created.id, { status }) : created;
  });

  const onSubmit = form.handleSubmit(
    (v) => {
      setServerError(null);
      save.mutate(v, {
        onSuccess: (r) => {
          toast({ title: `Course ${r.name} saved`, variant: 'success' });
          navigate(`${base}/courses`);
        },
        onError: (e) => {
          if (e instanceof ApiClientError && e.field && e.field in LABELS)
            setError(
              e.field as keyof CourseFormValues,
              { message: e.message },
              { shouldFocus: true },
            );
          else if (e instanceof ApiClientError && /code/i.test(e.code ?? ''))
            setError('code', { message: e.message }, { shouldFocus: true });
          else setServerError(errorText(e));
        },
      });
    },
    (errs) => {
      const first = ORDER.find((k) => errs[k]);
      if (first) setFocus(first);
      toast({
        title: `Fix ${Object.keys(errs).length} ${Object.keys(errs).length === 1 ? 'field' : 'fields'} before saving`,
        variant: 'error',
      });
    },
  );

  const e = formState.errors;
  const invalid = ORDER.filter((k) => e[k]).map((k) => [k, LABELS[k]] as [string, string]);
  const title = courseId ? 'Edit course' : 'New course';
  return (
    <FormPage
      prefix={P}
      pageId="page-form-course"
      ready={!courseId || !existing.isPending}
      breadcrumb={[{ label: 'Courses', to: `${base}/courses` }, { label: title }]}
      title={title}
      errors={formState.submitCount > 0 ? invalid : []}
      onFocusField={(k) => setFocus(k as keyof CourseFormValues)}
      onSubmit={onSubmit}
      fieldCount={ORDER.length}
      cancelTo={`${base}/courses`}
      saveLabel={courseId ? 'Save changes' : 'Save course'}
      saving={save.isPending}
      serverError={existing.isError ? errorText(existing.error) : serverError}
    >
      <FormSection prefix={P} title="Basics">
        <Input
          label="Course name"
          required
          placeholder="e.g. B.Tech"
          className="col-span-full sm:col-span-2"
          error={e.name?.message}
          data-testid={`${P}-name-input`}
          {...register('name')}
        />
        <Input
          label="Course code"
          required
          placeholder="BTECH"
          hint="Suggested from the name. Unique in your organization."
          className="[&_input]:font-extrabold [&_input]:uppercase [&_input]:tracking-[.06em]"
          error={e.code?.message}
          data-testid={`${P}-code-input`}
          {...register('code')}
        />
        <Select
          label="Course type"
          required
          placeholder="Choose…"
          options={toOptions(COURSE_TYPES)}
          error={e.courseType?.message}
          data-testid={`${P}-course-type-select`}
          {...register('courseType')}
        />
        <Input
          label="Department"
          placeholder="e.g. Electrical Engineering"
          error={e.department?.message}
          data-testid={`${P}-department-input`}
          {...register('department')}
        />
        <Select
          label="Medium of instruction"
          options={toOptions(LANGUAGES)}
          data-testid={`${P}-medium-select`}
          {...register('medium')}
        />
        <Textarea
          label="Description"
          rows={3}
          className="col-span-full"
          error={e.description?.message}
          data-testid={`${P}-description-input`}
          {...register('description')}
        />
      </FormSection>
      <FormSection prefix={P} title="Duration">
        <Input
          label="Duration"
          required
          inputMode="numeric"
          error={e.durationValue?.message}
          data-testid={`${P}-duration-value-input`}
          {...register('durationValue')}
        />
        <Select
          label="Duration unit"
          required
          options={toOptions(DURATION_UNITS)}
          error={e.durationUnit?.message}
          data-testid={`${P}-duration-unit-select`}
          {...register('durationUnit')}
        />
        <Input
          label="Number of semesters / terms"
          inputMode="numeric"
          error={e.terms?.message}
          data-testid={`${P}-terms-input`}
          {...register('terms')}
        />
        <Input
          label="Start date"
          type="date"
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
      </FormSection>
      <FormSection prefix={P} title="Intake, fees & status">
        <Input
          label="Seats / intake"
          inputMode="numeric"
          error={e.seats?.message}
          data-testid={`${P}-seats-input`}
          {...register('seats')}
        />
        <Input
          label="Total fee (₹)"
          inputMode="decimal"
          hint="Leave empty if fees are not collected here."
          error={e.fee?.message}
          data-testid={`${P}-fee-input`}
          {...register('fee')}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <ChoicePills
              label="Status"
              required
              value={field.value}
              options={STATUS_PILLS}
              onChange={field.onChange}
              testId={`${P}-status-radio`}
            />
          )}
        />
      </FormSection>
    </FormPage>
  );
}
