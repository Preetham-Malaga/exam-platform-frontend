// PURPOSE: The full student and teacher forms (prototype SPEC.student, SPEC.teacher) on their own pages:
//          /org/students/new, /org/students/:studentId/edit, /org/teachers/new, /org/teachers/:teacherId/edit.
// WHY: Personal details, education background, contact, parent / guardian (students) or professional details (teachers)
//      and the login. Core fields go to their columns; the rest is kept in the person's "details" (migration 047).
//      Until that update is applied the core fields still save and the page says the extra details were not kept.
// DEPENDS ON: components/forms/FormPage.tsx, services/studentService.ts + teacherService.ts, features/batches.

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '@/components/feedback/Toast';
import { Checkbox, Input, Select, Textarea } from '@/components/forms/Form';
import { ChoicePills, FormPage, FormSection } from '@/components/forms/FormPage';
import { useUnitTree } from '@/features/academic/hooks';
import { unitOptions } from '@/features/academic/tree';
import { errorText } from '@/features/academic/ui';
import { INDIAN_STATES } from '@/features/auth/india';
import { useBatches } from '@/features/batches/batches';
import { useStudentMutation } from '@/features/students/hooks';
import { useTeacher, useTeacherMutation } from '@/features/teachers/hooks';
import { ApiClientError } from '@/lib/api';
import { studentService } from '@/services/studentService';
import { teacherService } from '@/services/teacherService';

const opts = (a: readonly string[]) => a.map((v) => ({ value: v, label: v }));
const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'] as const;
const TODAY = new Date().toISOString().slice(0, 10);
const MOBILE = /^(\+?91)?[6-9]\d{9}$/;
const mobile = (msg = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.') =>
  z
    .string()
    .trim()
    .refine((s) => s === '' || MOBILE.test(s.replace(/[\s-]/g, '')), msg);
const email = z
  .string()
  .trim()
  .refine(
    (s) => s === '' || /^\S+@\S+\.\S+$/.test(s),
    'Enter a valid email, like name@institution.org.',
  );
const opt = (max: number) => z.string().trim().max(max, `Keep it to ${max} characters or fewer.`);
const past = z.string().refine((s) => s === '' || s < TODAY, 'Must be a date in the past.');
const year = z
  .string()
  .trim()
  .refine(
    (s) => s === '' || (/^\d{4}$/.test(s) && +s >= 1950 && +s <= 2100),
    'Enter a year like 2024.',
  );
const pct = z
  .string()
  .trim()
  .refine(
    (s) => s === '' || (!Number.isNaN(+s) && +s >= 0 && +s <= 100),
    'Enter a number from 0 to 100.',
  );
const pin = z
  .string()
  .trim()
  .refine((s) => s === '' || /^\d{6}$/.test(s), 'Enter a 6-digit PIN code.');

/** Shared personal + contact fields. */
const personal = {
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter full name.')
    .max(150, 'Keep it to 150 characters or fewer.'),
  gender: z.string(),
  dateOfBirth: past,
  email,
  phone: mobile(),
  altMobile: mobile(),
  address: opt(300),
  city: opt(100),
  state: z.string(),
  pinCode: pin,
  invite: z.boolean(),
  status: z.enum(['Active', 'Inactive']),
};
const inviteNeedsEmail = (v: { invite: boolean; email: string }) => !v.invite || v.email !== '';

const studentSchema = z
  .object({
    ...personal,
    rollNumber: z
      .string()
      .trim()
      .min(1, 'Enter roll number.')
      .max(50, 'Keep it to 50 characters or fewer.'),
    admissionNumber: opt(30),
    admissionDate: z.string(),
    batchId: z.string(),
    academicUnitId: z.string(),
    previousInstitution: opt(150),
    board: opt(100),
    previousCourse: opt(100),
    yearOfPassing: year,
    previousResult: pct,
    guardianName: opt(100),
    guardianRelation: z.string(),
    guardianMobile: mobile(),
    guardianEmail: email,
    guardianOccupation: opt(100),
    updatesVia: z.array(z.string()),
  })
  .refine(inviteNeedsEmail, {
    path: ['email'],
    message: 'An e-mail address is needed to send the invitation.',
  });
type StudentValues = z.infer<typeof studentSchema>;

const teacherSchema = z
  .object({
    ...personal,
    employeeCode: z
      .string()
      .trim()
      .min(1, 'Enter employee ID.')
      .max(30, 'Keep it to 30 characters or fewer.')
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Use letters, numbers, ".", "_" or "-" (no spaces).'),
    designation: z.string(),
    department: opt(100),
    joiningDate: z.string(),
    employmentType: z.string(),
    experienceYears: z
      .string()
      .trim()
      .refine(
        (s) => s === '' || (!Number.isNaN(+s) && +s >= 0 && +s <= 60),
        'Enter years from 0 to 60.',
      ),
    qualification: opt(100),
    specialization: opt(100),
    university: opt(150),
    yearOfPassing: year,
  })
  .refine(inviteNeedsEmail, {
    path: ['email'],
    message: 'An e-mail address is needed to send the invitation.',
  });
type TeacherValues = z.infer<typeof teacherSchema>;

const PERSONAL_DEFAULTS = {
  fullName: '',
  gender: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  altMobile: '',
  address: '',
  city: '',
  state: '',
  pinCode: '',
  invite: true,
  status: 'Active' as const,
};
const str = (v: unknown) => (v == null ? '' : String(v));
/** Keeps only the fields that were filled in; numbers where the API expects numbers. */
function detailsFrom(v: Record<string, unknown>, keys: string[], numbers: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const x = v[k];
    if (Array.isArray(x)) {
      if (x.length) out[k] = x;
    } else if (typeof x === 'string' && x.trim() !== '')
      out[k] = numbers.includes(k) ? Number(x) : x.trim();
  }
  return out;
}

const STUDENT_DETAIL_KEYS = [
  'gender',
  'dateOfBirth',
  'altMobile',
  'address',
  'city',
  'state',
  'pinCode',
  'admissionNumber',
  'admissionDate',
  'previousInstitution',
  'board',
  'previousCourse',
  'yearOfPassing',
  'previousResult',
  'guardianName',
  'guardianRelation',
  'guardianMobile',
  'guardianEmail',
  'guardianOccupation',
  'updatesVia',
];
const TEACHER_DETAIL_KEYS = [
  'gender',
  'dateOfBirth',
  'altMobile',
  'address',
  'city',
  'state',
  'pinCode',
  'designation',
  'department',
  'joiningDate',
  'employmentType',
  'experienceYears',
  'qualification',
  'specialization',
  'university',
  'yearOfPassing',
];

/** Toast after saving: invitation outcome, and whether the extra details were kept. */
function savedToast(
  toast: ReturnType<typeof useToast>['toast'],
  who: string,
  r: { inviteError?: { message: string } | null; details?: Record<string, unknown> },
  sentDetails: Record<string, unknown>,
  invited: boolean,
  email: string,
) {
  const lost = Object.keys(sentDetails).length > 0 && Object.keys(r.details ?? {}).length === 0;
  if (r.inviteError)
    toast({
      title: `${who} saved, but the invitation was not sent`,
      description: r.inviteError.message,
      variant: 'warning',
    });
  else
    toast({
      title: `${who} saved`,
      ...(invited ? { description: `An invitation was sent to ${email}.` } : {}),
      variant: 'success',
    });
  if (lost)
    toast({
      title: 'Extra details were not saved yet',
      description:
        'Date of birth, education and the other extra fields need a database update (npm run migrate).',
      variant: 'warning',
    });
}

function useFirstErrorFocus<T extends Record<string, unknown>>(order: Array<keyof T>) {
  return (
    errs: Partial<Record<keyof T, unknown>>,
    setFocus: (k: keyof T) => void,
    toast: ReturnType<typeof useToast>['toast'],
  ) => {
    const first = order.find((k) => errs[k]);
    if (first) setFocus(first);
    const n = Object.keys(errs).length;
    toast({ title: `Fix ${n} ${n === 1 ? 'field' : 'fields'} before saving`, variant: 'error' });
  };
}

function PersonalAndContact({
  P,
  form,
  locked,
}: {
  P: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared by the student and teacher forms
  form: any;
  locked: boolean;
}) {
  const e = form.formState.errors;
  const r = form.register;
  return (
    <>
      <FormSection prefix={P} title="Personal details">
        <Input
          label="Full name"
          required
          className="col-span-full sm:col-span-2"
          error={e.fullName?.message}
          data-testid={`${P}-full-name-input`}
          {...r('fullName')}
        />
        <Select
          label="Gender"
          placeholder="Choose…"
          options={opts(GENDERS)}
          data-testid={`${P}-gender-select`}
          {...r('gender')}
        />
        <Input
          label="Date of birth"
          type="date"
          max={TODAY}
          error={e.dateOfBirth?.message}
          data-testid={`${P}-dob-input`}
          {...r('dateOfBirth')}
        />
      </FormSection>
      <FormSection prefix={P} title="Contact">
        <Input
          label="Email"
          type="email"
          className="col-span-full sm:col-span-2"
          disabled={locked}
          hint={
            locked ? 'Their login; it cannot change here.' : 'Their login and invitation go here.'
          }
          error={e.email?.message}
          data-testid={`${P}-email-input`}
          {...r('email')}
        />
        <Input
          label="Mobile number"
          type="tel"
          placeholder="98480 12345"
          error={e.phone?.message}
          data-testid={`${P}-mobile-input`}
          {...r('phone')}
        />
        <Input
          label="Alternate mobile"
          type="tel"
          error={e.altMobile?.message}
          data-testid={`${P}-alt-mobile-input`}
          {...r('altMobile')}
        />
        <Textarea
          label="Address"
          rows={2}
          className="col-span-full"
          error={e.address?.message}
          data-testid={`${P}-address-input`}
          {...r('address')}
        />
        <Input
          label="City"
          error={e.city?.message}
          data-testid={`${P}-city-input`}
          {...r('city')}
        />
        <Select
          label="State / UT"
          placeholder="Choose…"
          options={INDIAN_STATES}
          data-testid={`${P}-state-select`}
          {...r('state')}
        />
        <Input
          label="PIN code"
          inputMode="numeric"
          error={e.pinCode?.message}
          data-testid={`${P}-pin-input`}
          {...r('pinCode')}
        />
      </FormSection>
    </>
  );
}

function LoginSection({
  P,
   
  form,
  isNew,
  hasLogin,
}: {
  P: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared by the student and teacher forms
  form: any;
  isNew: boolean;
  hasLogin: boolean;
}) {
  return (
    <FormSection prefix={P} title="Login & status">
      {isNew ? (
        <Checkbox
          label="Send the invitation e-mail now"
          description="Invitation links expire after 72 hours and can be re-sent from the list."
          data-testid={`${P}-send-invite-checkbox`}
          {...form.register('invite')}
        />
      ) : (
        <p className="m-0 text-[13px] font-semibold text-muted" data-testid={`${P}-login-status`}>
          {hasLogin ? 'Has a login.' : 'No login yet — send the invitation from the list.'}
        </p>
      )}
      <Controller
        control={form.control}
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
  );
}

// ======================= Student =======================
const S_LABELS: Partial<Record<keyof StudentValues, string>> = {
  fullName: 'Full name',
  dateOfBirth: 'Date of birth',
  rollNumber: 'Roll number',
  email: 'Email',
  phone: 'Mobile number',
  altMobile: 'Alternate mobile',
  pinCode: 'PIN code',
  yearOfPassing: 'Year of passing',
  previousResult: 'Previous result (%)',
  guardianMobile: 'Parent mobile',
  guardianEmail: 'Parent email',
};
const S_ORDER = Object.keys(S_LABELS) as Array<keyof StudentValues>;

export function StudentFormPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const P = 'student-form';
  const batches = useBatches();
  const tree = useUnitTree();
  const units = useMemo(() => unitOptions(tree.data?.units ?? []), [tree.data]);
  const existing = useQuery({
    queryKey: ['students', 'one', studentId],
    queryFn: () => studentService.get(studentId!),
    enabled: Boolean(studentId),
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<StudentValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      ...PERSONAL_DEFAULTS,
      invite: false,
      rollNumber: '',
      admissionNumber: '',
      admissionDate: '',
      batchId: '',
      academicUnitId: '',
      previousInstitution: '',
      board: '',
      previousCourse: '',
      yearOfPassing: '',
      previousResult: '',
      guardianName: '',
      guardianRelation: '',
      guardianMobile: '',
      guardianEmail: '',
      guardianOccupation: '',
      updatesVia: ['WhatsApp'],
    },
  });
  const s = existing.data;
  const pickersReady =
    Boolean(batches.data || batches.isError) && Boolean(tree.data || tree.isError);
  useEffect(() => {
    if (!s || !pickersReady) return;
    const d = s.details ?? {};
    form.reset({
      ...PERSONAL_DEFAULTS,
      invite: false,
      fullName: s.fullName,
      email: s.email ?? '',
      phone: s.phone ?? '',
      status: s.status === 'inactive' ? 'Inactive' : 'Active',
      rollNumber: s.rollNumber,
      batchId: s.batchId ?? '',
      academicUnitId: s.academicUnitId ?? '',
      ...Object.fromEntries(
        STUDENT_DETAIL_KEYS.filter((k) => k !== 'updatesVia').map((k) => [k, str(d[k])]),
      ),
      updatesVia: Array.isArray(d.updatesVia) ? (d.updatesVia as string[]) : [],
    } as StudentValues);
  }, [s, pickersReady, form]);

  const save = useStudentMutation(async (v: StudentValues) => {
    const details = detailsFrom(v, STUDENT_DETAIL_KEYS, ['yearOfPassing', 'previousResult']);
    const core = {
      rollNumber: v.rollNumber,
      fullName: v.fullName,
      phone: v.phone ? v.phone.replace(/[\s-]/g, '') : null,
      academicUnitId: v.academicUnitId || null,
      ...(v.batchId ? { batchId: v.batchId } : studentId ? { batchId: null } : {}),
      details,
    };
    const r = studentId
      ? await studentService.update(studentId, {
          ...core,
          status: v.status === 'Active' ? 'active' : 'inactive',
          ...(s?.userId ? {} : { email: v.email || null }),
        })
      : await studentService.create({ ...core, email: v.email || null, invite: v.invite });
    return { r, details };
  });
  const focusFirst = useFirstErrorFocus<StudentValues>(S_ORDER);
  const onSubmit = form.handleSubmit(
    (v) => {
      setServerError(null);
      save.mutate(v, {
        onSuccess: ({ r, details }) => {
          savedToast(toast, 'Student', r, details, !studentId && v.invite, v.email);
          navigate('/org/students');
        },
        onError: (e) => {
          if (e instanceof ApiClientError && e.field && e.field in S_LABELS)
            form.setError(
              e.field as keyof StudentValues,
              { message: e.message },
              { shouldFocus: true },
            );
          else setServerError(errorText(e));
        },
      });
    },
    (errs) => focusFirst(errs, (k) => form.setFocus(k), toast),
  );
  const e = form.formState.errors;
  const r = form.register;
  const title = studentId ? 'Edit student' : 'New student';
  return (
    <FormPage
      prefix={P}
      pageId="page-form-student"
      ready={!studentId || !existing.isPending}
      breadcrumb={[{ label: 'Students', to: '/org/students' }, { label: title }]}
      title={title}
      errors={
        form.formState.submitCount > 0
          ? S_ORDER.filter((k) => e[k]).map((k) => [k, S_LABELS[k]!])
          : []
      }
      onFocusField={(k) => form.setFocus(k as keyof StudentValues)}
      onSubmit={onSubmit}
      fieldCount={32}
      cancelTo="/org/students"
      saveLabel={studentId ? 'Save changes' : 'Save student'}
      saving={save.isPending}
      serverError={existing.isError ? errorText(existing.error) : serverError}
    >
      <PersonalAndContact P={P} form={form} locked={Boolean(s?.userId)} />
      <FormSection prefix={P} title="Academic details">
        <Input
          label="Roll number"
          required
          hint="Unique in your organization."
          error={e.rollNumber?.message}
          data-testid={`${P}-roll-number-input`}
          {...r('rollNumber')}
        />
        <Input
          label="Admission number"
          error={e.admissionNumber?.message}
          data-testid={`${P}-admission-number-input`}
          {...r('admissionNumber')}
        />
        <Input
          label="Admission date"
          type="date"
          data-testid={`${P}-admission-date-input`}
          {...r('admissionDate')}
        />
        <Select
          label="Batch"
          placeholder={batches.isError ? 'Batches need the database update' : 'No batch'}
          disabled={batches.isError}
          hint="Classes and materials reach students through their batch."
          options={(batches.data?.items ?? []).map((b) => ({ value: b.id, label: b.name }))}
          data-testid={`${P}-batch-select`}
          {...r('batchId')}
        />
        <Select
          label="Academic unit"
          placeholder="Not placed yet"
          hint="Exams assigned to this unit reach the student."
          options={units}
          data-testid={`${P}-unit-select`}
          {...r('academicUnitId')}
        />
      </FormSection>
      <FormSection prefix={P} title="Education background">
        <Input
          label="Previous school / college"
          className="col-span-full sm:col-span-2"
          error={e.previousInstitution?.message}
          data-testid={`${P}-previous-institution-input`}
          {...r('previousInstitution')}
        />
        <Input
          label="Board / university"
          placeholder="e.g. CBSE, State Board, JNTU"
          error={e.board?.message}
          data-testid={`${P}-board-input`}
          {...r('board')}
        />
        <Input
          label="Previous class / course"
          placeholder="e.g. Class 12, Diploma"
          error={e.previousCourse?.message}
          data-testid={`${P}-previous-course-input`}
          {...r('previousCourse')}
        />
        <Input
          label="Year of passing"
          inputMode="numeric"
          error={e.yearOfPassing?.message}
          data-testid={`${P}-year-of-passing-input`}
          {...r('yearOfPassing')}
        />
        <Input
          label="Previous result (%)"
          inputMode="decimal"
          error={e.previousResult?.message}
          data-testid={`${P}-previous-result-input`}
          {...r('previousResult')}
        />
      </FormSection>
      <FormSection prefix={P} title="Parent / guardian">
        <Input
          label="Parent / guardian name"
          className="col-span-full sm:col-span-2"
          error={e.guardianName?.message}
          data-testid={`${P}-guardian-name-input`}
          {...r('guardianName')}
        />
        <Select
          label="Relation"
          placeholder="Choose…"
          options={opts(['Father', 'Mother', 'Guardian', 'Other'])}
          data-testid={`${P}-guardian-relation-select`}
          {...r('guardianRelation')}
        />
        <Input
          label="Parent mobile"
          type="tel"
          error={e.guardianMobile?.message}
          data-testid={`${P}-guardian-mobile-input`}
          {...r('guardianMobile')}
        />
        <Input
          label="Parent email"
          type="email"
          error={e.guardianEmail?.message}
          data-testid={`${P}-guardian-email-input`}
          {...r('guardianEmail')}
        />
        <Input
          label="Occupation"
          error={e.guardianOccupation?.message}
          data-testid={`${P}-guardian-occupation-input`}
          {...r('guardianOccupation')}
        />
        <Controller
          control={form.control}
          name="updatesVia"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-muted">Send progress updates by</span>
              <div
                role="group"
                aria-label="Send progress updates by"
                className="flex flex-wrap gap-2"
              >
                {['WhatsApp', 'SMS', 'Email'].map((o) => {
                  const on = field.value.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() =>
                        field.onChange(
                          on ? field.value.filter((x: string) => x !== o) : [...field.value, o],
                        )
                      }
                      className={`min-h-[38px] rounded-full border-[1.5px] px-3.5 text-[13px] font-bold ${on ? 'border-transparent bg-primary text-on-primary' : 'border-border bg-bg text-ink'}`}
                      data-testid={`${P}-updates-via-option`}
                      data-value={o}
                    >
                      {on ? '✓ ' : ''}
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        />
      </FormSection>
      <LoginSection P={P} form={form} isNew={!studentId} hasLogin={Boolean(s?.userId)} />
    </FormPage>
  );
}

// ======================= Teacher =======================
const T_LABELS: Partial<Record<keyof TeacherValues, string>> = {
  fullName: 'Full name',
  employeeCode: 'Employee ID',
  dateOfBirth: 'Date of birth',
  email: 'Email',
  phone: 'Mobile number',
  altMobile: 'Alternate mobile',
  pinCode: 'PIN code',
  experienceYears: 'Experience (years)',
  yearOfPassing: 'Year of passing',
};
const T_ORDER = Object.keys(T_LABELS) as Array<keyof TeacherValues>;

export function TeacherFormPage() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const P = 'teacher-form';
  const existing = useTeacher(teacherId ?? null);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<TeacherValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      ...PERSONAL_DEFAULTS,
      employeeCode: '',
      designation: '',
      department: '',
      joiningDate: '',
      employmentType: 'Full-time',
      experienceYears: '',
      qualification: '',
      specialization: '',
      university: '',
      yearOfPassing: '',
    },
  });
  const t = existing.data;
  useEffect(() => {
    if (!t) return;
    const d = t.details ?? {};
    form.reset({
      ...PERSONAL_DEFAULTS,
      invite: false,
      fullName: t.fullName,
      email: t.email ?? '',
      phone: t.phone ?? '',
      status: t.status === 'inactive' ? 'Inactive' : 'Active',
      employeeCode: t.employeeCode,
      employmentType: 'Full-time',
      ...Object.fromEntries(TEACHER_DETAIL_KEYS.map((k) => [k, str(d[k])])),
    } as TeacherValues);
  }, [t, form]);

  const save = useTeacherMutation(async (v: TeacherValues) => {
    const details = detailsFrom(v, TEACHER_DETAIL_KEYS, ['yearOfPassing', 'experienceYears']);
    const core = {
      employeeCode: v.employeeCode,
      fullName: v.fullName,
      phone: v.phone ? v.phone.replace(/[\s-]/g, '') : null,
      details,
    };
    const r = teacherId
      ? await teacherService.update(teacherId, {
          ...core,
          status: v.status === 'Active' ? 'active' : 'inactive',
          ...(t?.userId ? {} : { email: v.email || null }),
        })
      : await teacherService.create({ ...core, email: v.email || null, invite: v.invite });
    return { r, details };
  });
  const focusFirst = useFirstErrorFocus<TeacherValues>(T_ORDER);
  const onSubmit = form.handleSubmit(
    (v) => {
      setServerError(null);
      save.mutate(v, {
        onSuccess: ({ r, details }) => {
          savedToast(toast, 'Teacher', r, details, !teacherId && v.invite, v.email);
          navigate('/org/teachers');
        },
        onError: (e) => {
          if (e instanceof ApiClientError && e.field && e.field in T_LABELS)
            form.setError(
              e.field as keyof TeacherValues,
              { message: e.message },
              { shouldFocus: true },
            );
          else setServerError(errorText(e));
        },
      });
    },
    (errs) => focusFirst(errs, (k) => form.setFocus(k), toast),
  );
  const e = form.formState.errors;
  const r = form.register;
  const title = teacherId ? 'Edit teacher' : 'New teacher';
  return (
    <FormPage
      prefix={P}
      pageId="page-form-teacher"
      ready={!teacherId || !existing.isPending}
      breadcrumb={[{ label: 'Teachers', to: '/org/teachers' }, { label: title }]}
      title={title}
      errors={
        form.formState.submitCount > 0
          ? T_ORDER.filter((k) => e[k]).map((k) => [k, T_LABELS[k]!])
          : []
      }
      onFocusField={(k) => form.setFocus(k as keyof TeacherValues)}
      onSubmit={onSubmit}
      fieldCount={27}
      cancelTo="/org/teachers"
      saveLabel={teacherId ? 'Save changes' : 'Save teacher'}
      saving={save.isPending}
      serverError={existing.isError ? errorText(existing.error) : serverError}
    >
      <PersonalAndContact P={P} form={form} locked={Boolean(t?.userId)} />
      <FormSection prefix={P} title="Professional details">
        <Input
          label="Employee ID"
          required
          hint="Unique in your organization."
          error={e.employeeCode?.message}
          data-testid={`${P}-employee-id-input`}
          {...r('employeeCode')}
        />
        <Select
          label="Designation"
          placeholder="Choose…"
          options={opts([
            'Professor',
            'Associate Professor',
            'Assistant Professor',
            'Lecturer',
            'Faculty',
            'Guest faculty',
          ])}
          data-testid={`${P}-designation-select`}
          {...r('designation')}
        />
        <Input
          label="Department"
          error={e.department?.message}
          data-testid={`${P}-department-input`}
          {...r('department')}
        />
        <Input
          label="Joining date"
          type="date"
          data-testid={`${P}-joining-date-input`}
          {...r('joiningDate')}
        />
        <Input
          label="Experience (years)"
          inputMode="decimal"
          error={e.experienceYears?.message}
          data-testid={`${P}-experience-input`}
          {...r('experienceYears')}
        />
        <Controller
          control={form.control}
          name="employmentType"
          render={({ field }) => (
            <ChoicePills
              label="Employment type"
              value={field.value}
              options={['Full-time', 'Part-time', 'Visiting']}
              onChange={field.onChange}
              testId={`${P}-employment-type-radio`}
            />
          )}
        />
      </FormSection>
      <FormSection prefix={P} title="Education background">
        <Input
          label="Highest qualification"
          placeholder="e.g. M.Tech, Ph.D."
          error={e.qualification?.message}
          data-testid={`${P}-qualification-input`}
          {...r('qualification')}
        />
        <Input
          label="Specialization"
          error={e.specialization?.message}
          data-testid={`${P}-specialization-input`}
          {...r('specialization')}
        />
        <Input
          label="University / institute"
          className="col-span-full sm:col-span-2"
          error={e.university?.message}
          data-testid={`${P}-university-input`}
          {...r('university')}
        />
        <Input
          label="Year of passing"
          inputMode="numeric"
          error={e.yearOfPassing?.message}
          data-testid={`${P}-year-of-passing-input`}
          {...r('yearOfPassing')}
        />
      </FormSection>
      <LoginSection P={P} form={form} isNew={!teacherId} hasLogin={Boolean(t?.userId)} />
    </FormPage>
  );
}
