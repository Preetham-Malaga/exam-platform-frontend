// PURPOSE: Drawer to choose a teacher's scope: the subjects, courses and academic units they may work in.
// WHY: A teacher only sees questions, topics and exams inside this scope (enforced by the database via app.in_scope).
//      Assigning a course or a unit covers every subject in it, so the choice can stay short.
// DEPENDS ON: features/teachers/hooks.ts, features/academic/hooks.ts + tree.ts, components/modals/Dialog.tsx.

import { useMemo, useState } from 'react';
import { ErrorState, LoadingState } from '@/components/feedback/States';
import { useToast } from '@/components/feedback/Toast';
import { Checkbox, Input } from '@/components/forms/Form';
import { Drawer } from '@/components/modals/Dialog';
import { Button } from '@/components/ui/Button';
import { useCourses, useSubjects, useUnitTree } from '@/features/academic/hooks';
import { unitOptions } from '@/features/academic/tree';
import { errorText } from '@/features/academic/ui';
import { teacherService } from '@/services/teacherService';
import type { ScopeType, Teacher, TeacherScope } from '@/types/teacher';
import { useTeacher, useTeacherMutation } from './hooks';

type Option = { value: string; label: string };
const keyOf = (type: ScopeType, id: string) => `${type}:${id}`;

function Section({
  title,
  hint,
  type,
  options,
  selected,
  toggle,
}: {
  title: string;
  hint: string;
  type: ScopeType;
  options: Option[];
  selected: Set<string>;
  toggle: (key: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const shown = options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()));
  const count = options.filter((o) => selected.has(keyOf(type, o.value))).length;
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold text-text">
        {title} <span className="font-normal text-muted">({count} selected)</span>
      </legend>
      <p className="text-xs text-muted">{hint}</p>
      {options.length > 8 && (
        <Input
          label={`Filter ${title.toLowerCase()}`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      {options.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
          {shown.map((o) => (
            <Checkbox
              key={o.value}
              label={o.label}
              checked={selected.has(keyOf(type, o.value))}
              onChange={() => toggle(keyOf(type, o.value))}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}

function ScopeForm({
  teacher,
  initial,
  removed,
  subjects,
  courses,
  units,
  onClose,
}: {
  teacher: Teacher;
  initial: TeacherScope[];
  removed: number;
  subjects: Option[];
  courses: Option[];
  units: Option[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState(
    () => new Set(initial.map((s) => keyOf(s.scopeType, s.scopeId))),
  );
  const save = useTeacherMutation((scopes: Array<{ scopeType: ScopeType; scopeId: string }>) =>
    teacherService.setScopes(teacher.id, scopes),
  );
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const submit = () =>
    save.mutate(
      [...selected].map((k) => {
        const [scopeType, scopeId] = k.split(':') as [ScopeType, string];
        return { scopeType, scopeId };
      }),
      {
        onSuccess: () => {
          toast({
            title: 'Scope saved',
            description: `${teacher.fullName} now works in ${selected.size} item(s).`,
            variant: 'success',
          });
          onClose();
        },
        onError: (e) =>
          toast({ title: 'Could not save the scope', description: errorText(e), variant: 'error' }),
      },
    );
  return (
    <div className="grid gap-5">
      {removed > 0 && (
        <p role="note" className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-text">
          {removed} assigned item(s) were deleted since; they will be dropped when you save.
        </p>
      )}
      <Section
        title="Subjects"
        hint="The teacher works on exactly these subjects."
        type="subject"
        options={subjects}
        selected={selected}
        toggle={toggle}
      />
      <Section
        title="Courses"
        hint="Covers every subject of the course."
        type="course"
        options={courses}
        selected={selected}
        toggle={toggle}
      />
      <Section
        title="Academic units"
        hint="Covers every subject placed on the unit or on any unit below it."
        type="academic_unit"
        options={units}
        selected={selected}
        toggle={toggle}
      />
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={save.isPending} onClick={submit}>
          Save scope
        </Button>
      </div>
    </div>
  );
}

export function ScopeDrawer({
  teacher,
  onClose,
}: {
  teacher: Teacher | null;
  onClose: () => void;
}) {
  const detail = useTeacher(teacher?.id ?? null);
  const subjects = useSubjects(
    { page: 1, pageSize: 100, sort: 'name', status: 'active' },
    Boolean(teacher),
  );
  const courses = useCourses(
    { page: 1, pageSize: 100, sort: 'name', status: 'active' },
    Boolean(teacher),
  );
  const tree = useUnitTree();
  const options = useMemo(
    () => ({
      subjects: (subjects.data?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.name} (${s.code})`,
      })),
      courses: (courses.data?.items ?? []).map((c) => ({
        value: c.id,
        label: `${c.name} (${c.code})`,
      })),
      units: unitOptions(tree.data?.units ?? []),
    }),
    [subjects.data, courses.data, tree.data],
  );
  const queries = [detail, subjects, courses, tree];
  const failed = queries.find((q) => q.isError);
  const loading = queries.some((q) => q.isPending);
  const scopes = detail.data?.scopes ?? [];

  return (
    <Drawer
      open={Boolean(teacher)}
      onClose={onClose}
      title={teacher ? `Scope of ${teacher.fullName}` : 'Scope'}
    >
      {!teacher ? null : failed ? (
        <ErrorState
          compact
          message={errorText(failed.error)}
          onRetry={() => queries.forEach((q) => void q.refetch())}
        />
      ) : loading ? (
        <LoadingState compact />
      ) : (
        <ScopeForm
          key={`${teacher.id}:${detail.dataUpdatedAt}`}
          teacher={teacher}
          initial={scopes.filter((s) => s.active)}
          removed={scopes.filter((s) => !s.active).length}
          subjects={options.subjects}
          courses={options.courses}
          units={options.units}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
}
