// PURPOSE: /org/courses/:courseId/subjects/new and /org/subjects/:subjectId/edit - the full subject form (prototype
//          SPEC.subject) on its own page.
// WHY: Add and edit never open a pop-up. Marks can't exceed the maximum; extra fields live in "details" (migration 044).
//      Which teachers teach a subject is set on the Teachers screen (teacher scope), not here.
// DEPENDS ON: components/forms/FormPage.tsx, features/academic/forms.ts, services/academicService.ts.

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select, Textarea } from '@/components/forms/Form';
import { ChoicePills, FormPage, FormSection } from '@/components/forms/FormPage';
import { useAcademicMutation, useCatalogTree, useSubject } from '@/features/academic/hooks';
import {
  STATUS_PILLS,
  SUBJECT_TYPES,
  TERMS,
  subjectDetailsFrom,
  subjectFormFrom,
  subjectFormSchema,
  toOptions,
  type SubjectFormValues,
} from '@/features/academic/forms';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { ApiClientError } from '@/lib/api';
import { academicService } from '@/services/academicService';
import { autoCode } from '@/utils/autoCode';

const P = 'subject-form';
const LABELS: Record<keyof SubjectFormValues, string> = {
  courseId: 'Course',
  name: 'Subject name',
  code: 'Subject code',
  subjectType: 'Subject type',
  term: 'Semester / term',
  credits: 'Credits',
  description: 'Syllabus summary',
  maxMarks: 'Maximum marks',
  passMarks: 'Pass marks',
  internalMarks: 'Internal marks',
  externalMarks: 'External marks',
  weeklyHours: 'Hours per week',
  order: 'Display order',
  status: 'Status',
};
const ORDER = Object.keys(LABELS) as Array<keyof SubjectFormValues>;

export default function SubjectFormPage() {
  const { courseId: parentCourse, subjectId } = useParams();
  const base = useAreaBase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tree = useCatalogTree();
  const existing = useSubject(subjectId);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      courseId: parentCourse ?? '',
      name: '',
      code: '',
      description: '',
      status: 'Active',
      ...subjectFormFrom(),
    },
  });
  const { register, control, setValue, setFocus, setError, formState } = form;
  const s = existing.data;
  useEffect(() => {
    if (s)
      form.reset({
        courseId: s.courseId ?? '',
        name: s.name,
        code: s.code,
        description: s.description ?? '',
        status: s.status === 'active' ? 'Active' : 'Inactive',
        ...subjectFormFrom(s.details),
      });
  }, [s, form]);
  // The course list arrives after the first render: select the course from the URL once its option exists.
  useEffect(() => {
    if (tree.data && parentCourse && !subjectId) setValue('courseId', parentCourse);
  }, [tree.data, parentCourse, subjectId, setValue]);
  const name = useWatch({ control, name: 'name' });
  useEffect(() => {
    // The code follows the name until the user edits the code (then the field is "dirty").
    if (!subjectId && !form.getFieldState('code').isDirty) setValue('code', autoCode(name ?? ''));
  }, [name, setValue, form, subjectId]);

  const save = useAcademicMutation(async (v: SubjectFormValues) => {
    const body = {
      code: v.code.toUpperCase(),
      name: v.name,
      description: v.description.trim() || null,
      courseId: v.courseId,
      details: subjectDetailsFrom(v),
    };
    const status = v.status === 'Active' ? ('active' as const) : ('inactive' as const);
    if (subjectId) return academicService.updateSubject(subjectId, { ...body, status });
    const created = await academicService.createSubject(body);
    return status === 'inactive' ? academicService.updateSubject(created.id, { status }) : created;
  });

  const courseName = tree.data?.courses.find((c) => c.id === form.getValues('courseId'))?.name;
  const onSubmit = form.handleSubmit(
    (v) => {
      setServerError(null);
      save.mutate(v, {
        onSuccess: (r) => {
          toast({
            title: subjectId
              ? `Subject ${r.name} saved`
              : `Subject ${r.name} added${courseName ? ` to ${courseName}` : ''}`,
            variant: 'success',
          });
          navigate(`${base}/courses`);
        },
        onError: (e) => {
          if (e instanceof ApiClientError && e.field && e.field in LABELS)
            setError(
              e.field as keyof SubjectFormValues,
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
  const invalid = ORDER.filter((k) => e[k]).map((k) => [k, LABELS[k]] as [string, string]);
  const title = subjectId ? 'Edit subject' : 'New subject';
  const courses = (tree.data?.courses ?? []).map((c) => ({ value: c.id, label: c.name }));
  return (
    <FormPage
      prefix={P}
      pageId="page-form-subject"
      ready={!tree.isPending && (!subjectId || !existing.isPending)}
      breadcrumb={[{ label: 'Courses', to: `${base}/courses` }, { label: title }]}
      title={title}
      errors={formState.submitCount > 0 ? invalid : []}
      onFocusField={(k) => setFocus(k as keyof SubjectFormValues)}
      onSubmit={onSubmit}
      fieldCount={ORDER.length}
      cancelTo={`${base}/courses`}
      saveLabel={subjectId ? 'Save changes' : 'Add subject'}
      saving={save.isPending}
      serverError={existing.isError ? errorText(existing.error) : serverError}
    >
      <FormSection prefix={P} title="Basics">
        <Select
          label="Course"
          required
          placeholder="Choose…"
          options={courses}
          error={e.courseId?.message}
          data-testid={`${P}-course-select`}
          {...register('courseId')}
        />
        <Input
          label="Subject name"
          required
          placeholder="e.g. Control Systems"
          className="col-span-full sm:col-span-2"
          error={e.name?.message}
          data-testid={`${P}-name-input`}
          {...register('name')}
        />
        <Input
          label="Subject code"
          required
          placeholder="CTRL"
          hint="Suggested from the name."
          className="[&_input]:font-extrabold [&_input]:uppercase [&_input]:tracking-[.06em]"
          error={e.code?.message}
          data-testid={`${P}-code-input`}
          {...register('code')}
        />
        <Select
          label="Subject type"
          required
          options={toOptions(SUBJECT_TYPES)}
          error={e.subjectType?.message}
          data-testid={`${P}-subject-type-select`}
          {...register('subjectType')}
        />
        <Select
          label="Semester / term"
          placeholder="Choose…"
          options={toOptions(TERMS)}
          data-testid={`${P}-term-select`}
          {...register('term')}
        />
        <Input
          label="Credits"
          inputMode="decimal"
          error={e.credits?.message}
          data-testid={`${P}-credits-input`}
          {...register('credits')}
        />
        <Textarea
          label="Syllabus summary"
          rows={3}
          className="col-span-full"
          error={e.description?.message}
          data-testid={`${P}-description-input`}
          {...register('description')}
        />
      </FormSection>
      <FormSection prefix={P} title="Assessment">
        {(['maxMarks', 'passMarks', 'internalMarks', 'externalMarks'] as const).map((k) => (
          <Input
            key={k}
            label={LABELS[k]}
            inputMode="decimal"
            error={e[k]?.message}
            data-testid={`${P}-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}-input`}
            {...register(k)}
          />
        ))}
      </FormSection>
      <FormSection prefix={P} title="Teaching">
        <Input
          label="Hours per week"
          inputMode="decimal"
          error={e.weeklyHours?.message}
          data-testid={`${P}-weekly-hours-input`}
          {...register('weeklyHours')}
        />
        <Input
          label="Display order"
          inputMode="numeric"
          error={e.order?.message}
          data-testid={`${P}-order-input`}
          {...register('order')}
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
