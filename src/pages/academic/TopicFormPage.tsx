// PURPOSE: /org/subjects/:subjectId/topics/new and /org/topics/:topicId/edit - the full topic form (prototype SPEC.topic)
//          on its own page. Teachers use the same page under /teacher for their own subjects.
// WHY: Add and edit never open a pop-up. Choosing a course narrows the subjects; extra fields live in "details".
// DEPENDS ON: components/forms/FormPage.tsx, features/academic/forms.ts, services/academicService.ts.

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select, Textarea } from '@/components/forms/Form';
import { ChoicePills, FormPage, FormSection } from '@/components/forms/FormPage';
import { useAcademicMutation, useCatalogTree, useTopic } from '@/features/academic/hooks';
import {
  DIFFICULTIES,
  STATUS_PILLS,
  topicDetailsFrom,
  topicFormSchema,
  type TopicFormValues,
} from '@/features/academic/forms';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { academicService } from '@/services/academicService';

const P = 'topic-form';
const LABELS: Record<keyof TopicFormValues, string> = {
  courseId: 'Course',
  subjectId: 'Subject',
  name: 'Topic name',
  code: 'Topic code',
  objectives: 'Learning objectives',
  hours: 'Estimated teaching hours',
  difficulty: 'Difficulty',
  order: 'Display order',
  status: 'Status',
};
const ORDER = Object.keys(LABELS) as Array<keyof TopicFormValues>;

export default function TopicFormPage() {
  const { subjectId: parentSubject, topicId } = useParams();
  const base = useAreaBase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const tree = useCatalogTree();
  const existing = useTopic(topicId);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: {
      courseId: '',
      subjectId: parentSubject ?? '',
      name: '',
      code: '',
      objectives: '',
      hours: '',
      difficulty: 'Medium',
      order: '',
      status: 'Active',
    },
  });
  const { register, control, setValue, setFocus, formState } = form;
  const subjects = tree.data?.subjects ?? [];
  const courseOf = (sid: string) => subjects.find((s) => s.id === sid)?.courseId ?? '';

  // The course follows the subject (from the URL, or from the topic being edited).
  const t = existing.data;
  useEffect(() => {
    if (!tree.data) return;
    if (t) {
      const d = t.details ?? {};
      form.reset({
        courseId: courseOf(t.subjectId),
        subjectId: t.subjectId,
        name: t.name,
        code: d.code ?? '',
        objectives: d.objectives ?? '',
        hours: d.hours == null ? '' : String(d.hours),
        difficulty: d.difficulty ?? 'Medium',
        order: String(t.position),
        status: d.status === 'inactive' ? 'Inactive' : 'Active',
      });
    } else if (parentSubject) {
      setValue('courseId', courseOf(parentSubject));
      setValue('subjectId', parentSubject);
    }
    // courseOf reads tree.data, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, tree.data, parentSubject]);

  const courseId = useWatch({ control, name: 'courseId' });
  const subjectOptions = subjects
    .filter((s) => !courseId || s.courseId === courseId)
    .map((s) => ({ value: s.id, label: s.name }));

  const save = useAcademicMutation((v: TopicFormValues) => {
    const body = {
      name: v.name,
      details: topicDetailsFrom(v),
      ...(v.order ? { position: Number(v.order) } : {}),
    };
    return topicId
      ? academicService.updateTopic(topicId, body)
      : academicService.createTopic({ subjectId: v.subjectId, ...body });
  });

  const onSubmit = form.handleSubmit(
    (v) => {
      setServerError(null);
      save.mutate(v, {
        onSuccess: (r) => {
          toast({ title: `Topic ${r.name} ${topicId ? 'saved' : 'added'}`, variant: 'success' });
          navigate(`${base}/courses`);
        },
        onError: (e) => setServerError(errorText(e)),
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
  const title = topicId ? 'Edit topic' : 'New topic';
  return (
    <FormPage
      prefix={P}
      pageId="page-form-topic"
      ready={!tree.isPending && (!topicId || !existing.isPending)}
      breadcrumb={[{ label: 'Courses', to: `${base}/courses` }, { label: title }]}
      title={title}
      errors={formState.submitCount > 0 ? invalid : []}
      onFocusField={(k) => setFocus(k as keyof TopicFormValues)}
      onSubmit={onSubmit}
      fieldCount={ORDER.length}
      cancelTo={`${base}/courses`}
      saveLabel={topicId ? 'Save changes' : 'Add topic'}
      saving={save.isPending}
      serverError={existing.isError ? errorText(existing.error) : serverError}
    >
      <FormSection prefix={P} title="Basics">
        <Select
          label="Course"
          required
          placeholder="Choose…"
          options={(tree.data?.courses ?? []).map((c) => ({ value: c.id, label: c.name }))}
          disabled={Boolean(topicId)}
          error={e.courseId?.message}
          data-testid={`${P}-course-select`}
          {...register('courseId', { onChange: () => setValue('subjectId', '') })}
        />
        <Select
          label="Subject"
          required
          placeholder={subjectOptions.length ? 'Choose…' : 'Choose the course first'}
          options={subjectOptions}
          disabled={Boolean(topicId)}
          error={e.subjectId?.message}
          data-testid={`${P}-subject-select`}
          {...register('subjectId')}
        />
        <Input
          label="Topic name"
          required
          placeholder="e.g. Synchronous Motors"
          className="col-span-full sm:col-span-2"
          error={e.name?.message}
          data-testid={`${P}-name-input`}
          {...register('name')}
        />
        <Input
          label="Topic code"
          error={e.code?.message}
          data-testid={`${P}-code-input`}
          {...register('code')}
        />
        <Textarea
          label="Learning objectives"
          rows={3}
          placeholder="One objective per line"
          className="col-span-full"
          error={e.objectives?.message}
          data-testid={`${P}-objectives-input`}
          {...register('objectives')}
        />
        <Input
          label="Estimated teaching hours"
          inputMode="decimal"
          error={e.hours?.message}
          data-testid={`${P}-hours-input`}
          {...register('hours')}
        />
        <Controller
          control={control}
          name="difficulty"
          render={({ field }) => (
            <ChoicePills
              label="Difficulty"
              value={field.value}
              options={DIFFICULTIES}
              onChange={field.onChange}
              testId={`${P}-difficulty-radio`}
            />
          )}
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
