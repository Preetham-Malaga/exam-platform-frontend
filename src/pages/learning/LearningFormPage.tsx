// PURPOSE: The add / edit pages for Learning (prototype SPEC.live, SPEC.recorded, SPEC.material):
//          /…/live/new, /…/live/:id/edit, /…/recorded/new (?liveClass=…), /…/recorded/:id/edit,
//          /…/materials/new, /…/materials/:id/edit.
// WHY: Add and edit never open a pop-up. One page, three field sets; the course narrows the subjects. Videos and files
//      are links for now (upload comes with file storage).
// DEPENDS ON: components/forms/FormPage.tsx, features/learning/learning.ts, batches, catalog tree and teachers hooks.

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '@/components/feedback/Toast';
import { Checkbox, Input, Select, Textarea } from '@/components/forms/Form';
import { ChoicePills, FormPage, FormSection } from '@/components/forms/FormPage';
import { useCatalogTree } from '@/features/academic/hooks';
import { errorText } from '@/features/academic/ui';
import { useBatches } from '@/features/batches/batches';
import {
  learningService,
  useLearning,
  useLearningMutation,
  type LearningKind,
  type LiveClass,
  type Material,
  type Recording,
} from '@/features/learning/learning';
import { useTeachers } from '@/features/teachers/hooks';
import { ApiClientError } from '@/lib/api';

type Kind = 'live' | 'recorded' | 'materials';
const API_KIND: Record<Kind, LearningKind> = {
  live: 'live-classes',
  recorded: 'recordings',
  materials: 'materials',
};
const META: Record<Kind, { prefix: string; list: string; label: string; noun: string }> = {
  live: { prefix: 'live-form', list: 'Live Classes', label: 'Schedule class', noun: 'live class' },
  recorded: {
    prefix: 'recorded-form',
    list: 'Recorded Classes',
    label: 'Publish recording',
    noun: 'recording',
  },
  materials: {
    prefix: 'materials-form',
    list: 'Materials',
    label: 'Publish material',
    noun: 'material',
  },
};
const URL_RE = /^https?:\/\/\S+\.\S+/;

const schema = z
  .object({
    kind: z.enum(['live', 'recorded', 'materials']),
    title: z.string().trim().min(1, 'Enter title.').max(120, 'Keep it to 120 characters or fewer.'),
    courseId: z.string(),
    subjectId: z.string(),
    batchId: z.string().min(1, 'Choose batch.'),
    teacherId: z.string(),
    // live
    agenda: z.string().max(1000, 'Keep it to 1000 characters or fewer.'),
    date: z.string(),
    start: z.string(),
    duration: z.string(),
    platform: z.string(),
    meetingLink: z.string().trim(),
    meetingId: z.string().trim().max(60),
    passcode: z.string().trim().max(60),
    willRecord: z.boolean(),
    // recording
    source: z.string(),
    videoUrl: z.string().trim(),
    videoDuration: z.string().trim().max(20, 'Keep it short, e.g. 45 min.'),
    liveClassId: z.string(),
    // material
    materialType: z.string(),
    linkUrl: z.string().trim(),
    // shared
    description: z.string().max(2000, 'Keep it to 2000 characters or fewer.'),
    availableFrom: z.string(),
    availableUntil: z.string(),
    allowDownload: z.boolean(),
    status: z.string(),
  })
  .superRefine((v, ctx) => {
    const need = (k: keyof typeof v, msg: string) => {
      if (!String(v[k]).trim()) ctx.addIssue({ code: 'custom', path: [k], message: msg });
    };
    const link = (k: 'meetingLink' | 'videoUrl' | 'linkUrl') => {
      if (v[k] && !URL_RE.test(v[k]))
        ctx.addIssue({
          code: 'custom',
          path: [k],
          message: 'Enter the full link, starting with https://',
        });
    };
    if (v.kind === 'live') {
      need('date', 'Enter date.');
      need('start', 'Enter start time.');
      need('meetingLink', 'Enter meeting link.');
      link('meetingLink');
    }
    if (v.kind === 'recorded') {
      need('videoUrl', 'Enter video link.');
      link('videoUrl');
      if (v.availableFrom && v.availableUntil && v.availableUntil < v.availableFrom)
        ctx.addIssue({
          code: 'custom',
          path: ['availableUntil'],
          message: 'Must be on or after available from.',
        });
    }
    if (v.kind === 'materials') {
      need('linkUrl', 'Enter link.');
      link('linkUrl');
    }
  });
type Values = z.infer<typeof schema>;

const LABELS: Partial<Record<keyof Values, string>> = {
  title: 'Title',
  batchId: 'Batch',
  date: 'Date',
  start: 'Start time',
  meetingLink: 'Meeting link',
  videoUrl: 'Video link',
  linkUrl: 'Link',
  availableUntil: 'Available until',
  videoDuration: 'Duration',
  agenda: 'Agenda',
  description: 'Description',
};
const ORDER = Object.keys(LABELS) as Array<keyof Values>;
const pad = (n: number) => String(n).padStart(2, '0');

function initial(kind: Kind): Values {
  return {
    kind,
    title: '',
    courseId: '',
    subjectId: '',
    batchId: '',
    teacherId: '',
    agenda: '',
    date: '',
    start: '',
    duration: '60',
    platform: 'Google Meet',
    meetingLink: '',
    meetingId: '',
    passcode: '',
    willRecord: false,
    source: 'YouTube',
    videoUrl: '',
    videoDuration: '',
    liveClassId: '',
    materialType: 'Notes',
    linkUrl: '',
    description: '',
    availableFrom: '',
    availableUntil: '',
    allowDownload: kind === 'materials',
    status: kind === 'live' ? 'Scheduled' : 'Published',
  };
}

function fromItem(kind: Kind, x: LiveClass | Recording | Material): Partial<Values> {
  const c = {
    title: x.title,
    courseId: x.courseId ?? '',
    subjectId: x.subjectId ?? '',
    batchId: x.batchId,
  };
  if (kind === 'live') {
    const l = x as LiveClass;
    const d = new Date(l.startsAt);
    return {
      ...c,
      teacherId: l.teacherId ?? '',
      agenda: l.agenda ?? '',
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      start: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      duration: String(l.durationMinutes),
      platform: l.platform,
      meetingLink: l.meetingLink,
      meetingId: l.meetingId ?? '',
      passcode: l.passcode ?? '',
      willRecord: l.willRecord,
      status: l.status === 'cancelled' ? 'Cancelled' : 'Scheduled',
    };
  }
  if (kind === 'recorded') {
    const r = x as Recording;
    return {
      ...c,
      teacherId: r.teacherId ?? '',
      source: r.source,
      videoUrl: r.videoUrl,
      videoDuration: r.duration ?? '',
      liveClassId: r.liveClassId ?? '',
      description: r.description ?? '',
      availableFrom: r.availableFrom ?? '',
      availableUntil: r.availableUntil ?? '',
      allowDownload: r.allowDownload,
      status: r.status === 'draft' ? 'Draft' : 'Published',
    };
  }
  const m = x as Material;
  return {
    ...c,
    materialType: m.materialType,
    linkUrl: m.linkUrl,
    description: m.description ?? '',
    availableFrom: m.availableFrom ?? '',
    allowDownload: m.allowDownload,
    status: m.status === 'draft' ? 'Draft' : 'Published',
  };
}

const nul = (s: string) => (s.trim() ? s.trim() : null);
function bodyFrom(v: Values): Record<string, unknown> {
  const c = {
    title: v.title,
    courseId: nul(v.courseId),
    subjectId: nul(v.subjectId),
    batchId: v.batchId,
  };
  if (v.kind === 'live')
    return {
      ...c,
      teacherId: nul(v.teacherId),
      agenda: nul(v.agenda),
      startsAt: new Date(`${v.date}T${v.start}:00`).toISOString(),
      durationMinutes: Number(v.duration),
      platform: v.platform,
      meetingLink: v.meetingLink,
      meetingId: nul(v.meetingId),
      passcode: nul(v.passcode),
      willRecord: v.willRecord,
      status: v.status === 'Cancelled' ? 'cancelled' : 'scheduled',
    };
  if (v.kind === 'recorded')
    return {
      ...c,
      teacherId: nul(v.teacherId),
      source: v.source,
      videoUrl: v.videoUrl,
      duration: nul(v.videoDuration),
      liveClassId: nul(v.liveClassId),
      description: nul(v.description),
      availableFrom: nul(v.availableFrom),
      availableUntil: nul(v.availableUntil),
      allowDownload: v.allowDownload,
      status: v.status === 'Draft' ? 'draft' : 'published',
    };
  return {
    ...c,
    materialType: v.materialType,
    linkUrl: v.linkUrl,
    description: nul(v.description),
    availableFrom: nul(v.availableFrom),
    allowDownload: v.allowDownload,
    status: v.status === 'Draft' ? 'draft' : 'published',
  };
}

export default function LearningFormPage({ kind }: { kind: Kind }) {
  const { itemId } = useParams();
  const [params] = useSearchParams();
  const area = useLocation().pathname.startsWith('/teacher') ? '/teacher' : '/org';
  const listPath = `${area}/${kind}`;
  const navigate = useNavigate();
  const { toast } = useToast();
  const meta = META[kind];
  const P = meta.prefix;
  const tree = useCatalogTree();
  const batches = useBatches();
  const teachers = useTeachers({ page: 1, pageSize: 100 });
  const existing = useLearning(API_KIND[kind]);
  const pastLive = useLearning('live-classes', { when: 'past' });
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial(kind) });
  const { register, control, setValue, setFocus, setError, formState } = form;

  // Fill the form once its pickers have options: an edited item, or a recording for a past live class.
  const ready = Boolean(tree.data && batches.data);
  const item = itemId ? existing.data?.items.find((x) => x.id === itemId) : undefined;
  const fromLive = params.get('liveClass');
  useEffect(() => {
    if (!ready) return;
    if (item) form.reset({ ...initial(kind), ...fromItem(kind, item) });
    else if (kind === 'recorded' && fromLive) {
      const l = pastLive.data?.items.find((x) => x.id === fromLive);
      if (l)
        form.reset({
          ...initial(kind),
          title: `${l.title} (recording)`,
          courseId: l.courseId ?? '',
          subjectId: l.subjectId ?? '',
          batchId: l.batchId,
          teacherId: l.teacherId ?? '',
          liveClassId: l.id,
        });
    }
  }, [ready, item, kind, fromLive, pastLive.data, form]);

  const courseId = useWatch({ control, name: 'courseId' });
  const subjects = (tree.data?.subjects ?? []).filter((s) => !courseId || s.courseId === courseId);
  const save = useLearningMutation((v: Values) =>
    itemId
      ? learningService.update(API_KIND[kind], itemId, bodyFrom(v))
      : learningService.create(API_KIND[kind], bodyFrom(v)),
  );
  const onSubmit = form.handleSubmit(
    (v) => {
      setServerError(null);
      save.mutate(v, {
        onSuccess: () => {
          toast({
            title: kind === 'live' && !itemId ? `${v.title} scheduled` : `${v.title} saved`,
            variant: 'success',
          });
          navigate(listPath);
        },
        onError: (e) => {
          if (e instanceof ApiClientError && e.field && e.field in LABELS)
            setError(e.field as keyof Values, { message: e.message }, { shouldFocus: true });
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
  const title = `${itemId ? 'Edit' : 'New'} ${meta.noun}`;
  const opts = (a: readonly string[]) => a.map((x) => ({ value: x, label: x }));
  const pills = (name: keyof Values, label: string, options: readonly string[]) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ChoicePills
          label={label}
          required
          value={String(field.value)}
          options={options}
          onChange={field.onChange}
          testId={`${P}-${name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}-radio`}
        />
      )}
    />
  );

  return (
    <FormPage
      prefix={P}
      pageId={`page-form-${kind}`}
      ready={ready && (!itemId || !existing.isPending)}
      breadcrumb={[{ label: meta.list, to: listPath }, { label: title }]}
      title={title}
      errors={
        formState.submitCount > 0 ? ORDER.filter((k) => e[k]).map((k) => [k, LABELS[k]!]) : []
      }
      onFocusField={(k) => setFocus(k as keyof Values)}
      onSubmit={onSubmit}
      fieldCount={kind === 'live' ? 15 : kind === 'recorded' ? 15 : 11}
      cancelTo={listPath}
      saveLabel={itemId ? 'Save changes' : meta.label}
      saving={save.isPending}
      serverError={itemId && existing.isSuccess && !item ? 'This item was not found.' : serverError}
    >
      <FormSection
        prefix={P}
        title={kind === 'live' ? 'Class' : kind === 'recorded' ? 'Video' : 'Material'}
      >
        <Input
          label="Title"
          required
          className="col-span-full sm:col-span-2"
          placeholder={
            kind === 'live' ? 'e.g. Synchronous Motors — Lecture 4' : 'e.g. Unit 2 Notes'
          }
          error={e.title?.message}
          data-testid={`${P}-title-input`}
          {...register('title')}
        />
        {kind === 'materials' && (
          <Select
            label="Material type"
            required
            options={opts([
              'Notes',
              'Slides',
              'Question paper',
              'Assignment',
              'Syllabus',
              'Reference',
              'Other',
            ])}
            data-testid={`${P}-material-type-select`}
            {...register('materialType')}
          />
        )}
        <Select
          label="Course"
          placeholder="Choose…"
          options={(tree.data?.courses ?? []).map((c) => ({ value: c.id, label: c.name }))}
          data-testid={`${P}-course-select`}
          {...register('courseId', { onChange: () => setValue('subjectId', '') })}
        />
        <Select
          label="Subject"
          placeholder={subjects.length ? 'Choose…' : 'Choose the course first'}
          options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          data-testid={`${P}-subject-select`}
          {...register('subjectId')}
        />
        <Select
          label={
            kind === 'materials'
              ? 'Batch who can see it'
              : kind === 'recorded'
                ? 'Batch who can watch'
                : 'Batch'
          }
          required
          placeholder="Choose…"
          options={(batches.data?.items ?? []).map((b) => ({ value: b.id, label: b.name }))}
          hint={
            batches.data && !batches.data.items.length
              ? 'Add a batch first (People › Batches).'
              : undefined
          }
          error={e.batchId?.message}
          data-testid={`${P}-batch-select`}
          {...register('batchId')}
        />
        {kind !== 'materials' && (
          <Select
            label="Teacher"
            placeholder="Choose…"
            options={(teachers.data?.items ?? []).map((t) => ({ value: t.id, label: t.fullName }))}
            data-testid={`${P}-teacher-select`}
            {...register('teacherId')}
          />
        )}
        {kind === 'live' && (
          <Textarea
            label="Agenda"
            rows={3}
            className="col-span-full"
            error={e.agenda?.message}
            data-testid={`${P}-agenda-input`}
            {...register('agenda')}
          />
        )}
        {kind === 'recorded' &&
          pills('source', 'Video source', ['YouTube', 'Vimeo', 'Google Drive', 'Other link'])}
        {kind === 'recorded' && (
          <Input
            label="Video link"
            required
            className="col-span-full sm:col-span-2"
            placeholder="https://youtu.be/…"
            error={e.videoUrl?.message}
            data-testid={`${P}-video-url-input`}
            {...register('videoUrl')}
          />
        )}
        {kind === 'recorded' && (
          <Input
            label="Duration"
            placeholder="e.g. 45 min"
            error={e.videoDuration?.message}
            data-testid={`${P}-duration-input`}
            {...register('videoDuration')}
          />
        )}
        {kind === 'recorded' && (
          <Select
            label="Recording of live class"
            placeholder="Not from a live class"
            options={(pastLive.data?.items ?? []).map((l) => ({ value: l.id, label: l.title }))}
            data-testid={`${P}-linked-live-select`}
            {...register('liveClassId')}
          />
        )}
        {kind === 'materials' && (
          <Input
            label="Link"
            required
            className="col-span-full sm:col-span-2"
            placeholder="https://drive.google.com/…"
            hint="A shared link to the file (Drive, OneDrive, website)."
            error={e.linkUrl?.message}
            data-testid={`${P}-link-input`}
            {...register('linkUrl')}
          />
        )}
        {kind !== 'live' && (
          <Textarea
            label="Description"
            rows={3}
            className="col-span-full"
            error={e.description?.message}
            data-testid={`${P}-description-input`}
            {...register('description')}
          />
        )}
      </FormSection>
      {kind === 'live' && (
        <FormSection prefix={P} title="Schedule & meeting">
          <Input
            label="Date"
            type="date"
            required
            error={e.date?.message}
            data-testid={`${P}-date-input`}
            {...register('date')}
          />
          <Input
            label="Start time"
            type="time"
            required
            error={e.start?.message}
            data-testid={`${P}-start-input`}
            {...register('start')}
          />
          <Select
            label="Duration"
            required
            options={[
              ['30', '30 min'],
              ['45', '45 min'],
              ['60', '60 min'],
              ['90', '90 min'],
              ['120', '2 hours'],
            ].map(([value, label]) => ({ value: value!, label: label! }))}
            data-testid={`${P}-duration-select`}
            {...register('duration')}
          />
          {pills('platform', 'Platform', ['Zoom', 'Google Meet', 'Microsoft Teams', 'Other'])}
          <Input
            label="Meeting link"
            required
            className="col-span-full sm:col-span-2"
            placeholder="https://meet.google.com/…"
            error={e.meetingLink?.message}
            data-testid={`${P}-link-input`}
            {...register('meetingLink')}
          />
          <Input
            label="Meeting ID"
            data-testid={`${P}-meeting-id-input`}
            {...register('meetingId')}
          />
          <Input
            label="Passcode"
            hint="Students see it when Join opens."
            data-testid={`${P}-passcode-input`}
            {...register('passcode')}
          />
          <Checkbox
            label="This class will be recorded"
            data-testid={`${P}-will-record-checkbox`}
            {...register('willRecord')}
          />
          {pills('status', 'Status', ['Scheduled', 'Cancelled'])}
        </FormSection>
      )}
      {kind !== 'live' && (
        <FormSection prefix={P} title="Availability">
          <Input
            label={kind === 'materials' ? 'Visible from' : 'Available from'}
            type="date"
            data-testid={`${P}-available-from-input`}
            {...register('availableFrom')}
          />
          {kind === 'recorded' && (
            <Input
              label="Available until"
              type="date"
              error={e.availableUntil?.message}
              data-testid={`${P}-available-until-input`}
              {...register('availableUntil')}
            />
          )}
          <Checkbox
            label={
              kind === 'recorded' ? 'Students can download the video' : 'Students can download'
            }
            data-testid={`${P}-allow-download-checkbox`}
            {...register('allowDownload')}
          />
          {pills('status', 'Status', ['Published', 'Draft'])}
        </FormSection>
      )}
    </FormPage>
  );
}

export const LiveFormPage = () => <LearningFormPage kind="live" />;
export const RecordingFormPage = () => <LearningFormPage kind="recorded" />;
export const MaterialFormPage = () => <LearningFormPage kind="materials" />;
