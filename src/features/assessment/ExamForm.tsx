// PURPOSE: The exam details + settings form, used by "New exam" and the exam's Details tab.
// WHY: One form keeps the rules identical in both places (code format, duration 1-600, window end after start).
// DEPENDS ON: features/academic/hooks.ts (courses), features/assessment/format.ts, shared form components.

import { useState } from 'react';
import { Checkbox, Input, Select, Textarea } from '@/components/forms/Form';
import { useCourses } from '@/features/academic/hooks';
import type { Exam, ExamBody, ExamSettings } from '@/types/assessment';
import { fromLocalInput, toLocalInput } from './format';

interface FormState {
  name: string;
  examCode: string;
  description: string;
  courseId: string;
  durationMinutes: string;
  passingPercentage: string;
  startAt: string;
  endAt: string;
  settings: ExamSettings;
}

const DEFAULT_SETTINGS: ExamSettings = {
  maxAttempts: 1,
  randomizeQuestions: false,
  randomizeOptions: false,
  showResults: true,
  showAnswers: false,
  leaderboardEnabled: false,
};

const initial = (e: Exam | null): FormState => ({
  name: e?.name ?? '',
  examCode: e?.examCode ?? '',
  description: e?.description ?? '',
  courseId: e?.courseId ?? '',
  durationMinutes: String(e?.durationMinutes ?? 60),
  passingPercentage: String(e?.passingPercentage ?? 40),
  startAt: toLocalInput(e?.startAt),
  endAt: toLocalInput(e?.endAt),
  settings: e?.settings ?? DEFAULT_SETTINGS,
});

function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = 'Enter a name';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(f.examCode.trim()))
    e.examCode = 'Letters, digits, ".", "_" or "-" (no spaces)';
  const d = Number(f.durationMinutes);
  if (!Number.isInteger(d) || d < 1 || d > 600) e.durationMinutes = 'Between 1 and 600 minutes';
  const p = Number(f.passingPercentage);
  if (!(p >= 0 && p <= 100)) e.passingPercentage = 'Between 0 and 100';
  if (f.startAt && f.endAt && new Date(f.endAt) <= new Date(f.startAt))
    e.endAt = 'Must be after the start';
  const m = f.settings.maxAttempts;
  if (!Number.isInteger(m) || m < 1 || m > 20) e.maxAttempts = 'Between 1 and 20';
  return e;
}

/** Form for exam details. `onSubmit` receives the API body; the parent owns the submit button (form id). */
export function ExamForm({
  id,
  exam,
  disabled,
  onSubmit,
}: {
  id: string;
  exam: Exam | null;
  disabled?: boolean;
  onSubmit: (body: ExamBody) => void;
}) {
  const [f, setF] = useState<FormState>(() => initial(exam));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const courses = useCourses({ page: 1, pageSize: 100, sort: 'name', status: 'active' });
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const setS = <K extends keyof ExamSettings>(k: K, v: ExamSettings[K]) =>
    setF((p) => ({ ...p, settings: { ...p.settings, [k]: v } }));

  return (
    <form
      id={id}
      noValidate
      className="grid gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        const e = validate(f);
        setErrors(e);
        if (Object.keys(e).length) return;
        onSubmit({
          name: f.name.trim(),
          examCode: f.examCode.trim(),
          description: f.description.trim() || null,
          courseId: f.courseId || null,
          durationMinutes: Number(f.durationMinutes),
          passingPercentage: Number(f.passingPercentage),
          startAt: fromLocalInput(f.startAt),
          endAt: fromLocalInput(f.endAt),
          settings: f.settings,
        });
      }}
    >
      <fieldset disabled={disabled} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Exam name"
            required
            value={f.name}
            error={errors.name}
            onChange={(e) => set('name', e.target.value)}
          />
          <Input
            label="Exam code"
            required
            hint="Unique in your organization."
            value={f.examCode}
            error={errors.examCode}
            onChange={(e) => set('examCode', e.target.value)}
          />
        </div>
        <Select
          label="Course"
          placeholder="No course"
          value={f.courseId}
          options={(courses.data?.items ?? []).map((c) => ({
            value: c.id,
            label: `${c.name} (${c.code})`,
          }))}
          onChange={(e) => set('courseId', e.target.value)}
        />
        <Textarea
          label="Instructions"
          rows={3}
          hint="Shown to students before they start."
          value={f.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Duration (minutes)"
            type="number"
            min={1}
            max={600}
            required
            value={f.durationMinutes}
            error={errors.durationMinutes}
            onChange={(e) => set('durationMinutes', e.target.value)}
          />
          <Input
            label="Pass mark (%)"
            type="number"
            min={0}
            max={100}
            required
            value={f.passingPercentage}
            error={errors.passingPercentage}
            onChange={(e) => set('passingPercentage', e.target.value)}
          />
          <Input
            label="Opens at"
            type="datetime-local"
            hint="Leave empty to open as soon as it is published."
            value={f.startAt}
            onChange={(e) => set('startAt', e.target.value)}
          />
          <Input
            label="Closes at"
            type="datetime-local"
            hint="Attempts end at this time at the latest."
            value={f.endAt}
            error={errors.endAt}
            onChange={(e) => set('endAt', e.target.value)}
          />
        </div>
        <fieldset className="grid gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-[13px] font-semibold text-text">Settings</legend>
          <div className="w-40">
            <Input
              label="Attempts allowed"
              type="number"
              min={1}
              max={20}
              value={String(f.settings.maxAttempts)}
              error={errors.maxAttempts}
              onChange={(e) => setS('maxAttempts', Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox
              label="Shuffle questions"
              checked={f.settings.randomizeQuestions}
              onChange={(e) => setS('randomizeQuestions', e.target.checked)}
            />
            <Checkbox
              label="Shuffle options"
              checked={f.settings.randomizeOptions}
              onChange={(e) => setS('randomizeOptions', e.target.checked)}
            />
            <Checkbox
              label="Show results to students"
              checked={f.settings.showResults}
              onChange={(e) => setS('showResults', e.target.checked)}
            />
            <Checkbox
              label="Show correct answers after submitting"
              checked={f.settings.showAnswers}
              disabled={!f.settings.showResults}
              onChange={(e) => setS('showAnswers', e.target.checked)}
            />
            <Checkbox
              label="Leaderboard for students"
              checked={f.settings.leaderboardEnabled}
              onChange={(e) => setS('leaderboardEnabled', e.target.checked)}
            />
          </div>
        </fieldset>
      </fieldset>
    </form>
  );
}
