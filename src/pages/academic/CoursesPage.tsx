// PURPOSE: /org/courses (and /teacher/courses) - the prototype's Courses tree (vSyllabus): courses → subjects → topics,
//          with search, expand/collapse, rename in place, delete confirmed in place, and links to the add/edit pages.
// WHY: One screen replaces Academic Structure, Courses, Subjects and Topics. All data comes from GET /catalog/tree in one
//      request; buttons follow the caller's permissions (UX only), the API and RLS decide what really happens.
// DEPENDS ON: features/academic/hooks.ts, services/academicService.ts, components/inline/Inline.tsx.

import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { InlineConfirm } from '@/components/inline/Inline';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { useAcademicMutation, useCatalogTree } from '@/features/academic/hooks';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { academicService } from '@/services/academicService';
import type { CatalogTree } from '@/types/academic';
import { cn } from '@/utils/cn';

type TreeSubject = CatalogTree['subjects'][number];
type TreeTopic = CatalogTree['topics'][number];
const NO_COURSE = '__none';

const iconBtn =
  'inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink';
const addLink =
  'flex min-h-[46px] w-full items-center gap-2 rounded-row border-2 border-dashed border-dash bg-surface-2 px-4 font-extrabold text-accent hover:no-underline';

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={cn('inline-flex transition-transform', open && 'rotate-90')}>
      <Icon name="chev" />
    </span>
  );
}

/** Name shown in a row, or an input while renaming (Enter saves, Esc cancels). */
function NodeName({
  name,
  renaming,
  onSave,
  onCancel,
}: {
  name: string;
  renaming: boolean;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(name);
  if (!renaming) return <span>{name}</span>;
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && value.trim() !== name) onSave(value.trim());
      else onCancel();
    }
    if (e.key === 'Escape') onCancel();
  };
  return (
    <input
      // Focus goes to the field the user just asked to rename.
      autoFocus
      aria-label={`New name for ${name}`}
      className="h-[38px] w-full max-w-xs rounded-input border-[1.5px] border-border bg-surface px-3 text-ink"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onCancel}
      data-testid="syllabus-rename-input"
    />
  );
}

export default function CoursesPage() {
  const base = useAreaBase();
  const perms = usePermissions();
  const { toast } = useToast();
  const tree = useCatalogTree();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const rename = useAcademicMutation(
    async (v: { kind: 'course' | 'subject'; id: string; name: string }): Promise<unknown> =>
      v.kind === 'course'
        ? academicService.updateCourse(v.id, { name: v.name })
        : academicService.updateSubject(v.id, { name: v.name }),
  );
  const remove = useAcademicMutation((v: { kind: 'course' | 'subject' | 'topic'; id: string }) =>
    v.kind === 'course'
      ? academicService.deleteCourse(v.id)
      : v.kind === 'subject'
        ? academicService.deleteSubject(v.id)
        : academicService.deleteTopic(v.id),
  );
  const restoreTopic = useAcademicMutation((t: TreeTopic) =>
    academicService.createTopic({ subjectId: t.subjectId, name: t.name, position: t.position }),
  );

  const data = tree.data;
  const { courses, subjectsOf, topicsOf, counts } = useMemo(() => {
    const subjectsOf = new Map<string, TreeSubject[]>();
    const topicsOf = new Map<string, TreeTopic[]>();
    for (const t of data?.topics ?? [])
      topicsOf.set(t.subjectId, [...(topicsOf.get(t.subjectId) ?? []), t]);
    for (const s of data?.subjects ?? []) {
      const key = s.courseId ?? NO_COURSE;
      subjectsOf.set(key, [...(subjectsOf.get(key) ?? []), s]);
    }
    const courses = [...(data?.courses ?? [])] as Array<{ id: string; code: string; name: string }>;
    // Subjects that are not in any course stay visible under their own heading.
    if (subjectsOf.has(NO_COURSE))
      courses.push({ id: NO_COURSE, code: '—', name: 'Not in a course' });
    return {
      courses,
      subjectsOf,
      topicsOf,
      counts: {
        courses: data?.courses.length ?? 0,
        subjects: data?.subjects.length ?? 0,
        topics: data?.topics.length ?? 0,
      },
    };
  }, [data]);

  const q = search.trim().toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const subjectMatches = (s: TreeSubject) =>
    match(s.name) || (topicsOf.get(s.id) ?? []).some((t) => match(t.name));
  const visible = courses.filter(
    (c) => match(c.name) || (subjectsOf.get(c.id) ?? []).some(subjectMatches),
  );
  // The first course and its first subject start open so the tree never looks empty.
  const isOpen = (id: string, i = -1) => Boolean(q) || (open[id] ?? i === 0);
  const toggle = (id: string, i = -1) => setOpen((o) => ({ ...o, [id]: !isOpen(id, i) }));

  const doRename = (kind: 'course' | 'subject', id: string, name: string) =>
    rename.mutate(
      { kind, id, name },
      {
        onSuccess: () => {
          setRenaming(null);
          toast({ title: 'Renamed', variant: 'success' });
        },
        onError: (e) =>
          toast({ title: 'Could not rename', description: errorText(e), variant: 'error' }),
      },
    );
  const doDelete = (kind: 'course' | 'subject', id: string, name: string) =>
    remove.mutate(
      { kind, id },
      {
        onSuccess: () => {
          setConfirm(null);
          toast({ title: `${name} deleted`, variant: 'success' });
        },
        onError: (e) => {
          setConfirm(null);
          toast({ title: `Could not delete ${name}`, description: errorText(e), variant: 'error' });
        },
      },
    );
  const deleteTopic = (t: TreeTopic) =>
    remove.mutate(
      { kind: 'topic', id: t.id },
      {
        onSuccess: () =>
          toast({
            title: `Topic ${t.name} deleted`,
            variant: 'success',
            action: { label: 'Undo', onClick: () => restoreTopic.mutate(t) },
          }),
        onError: (e) =>
          toast({
            title: 'Could not delete the topic',
            description: errorText(e),
            variant: 'error',
          }),
      },
    );

  const confirmRow = (
    id: string,
    kind: 'course' | 'subject',
    name: string,
    blocked: string | null,
  ) =>
    blocked ? (
      <div
        className="flex flex-wrap items-center justify-between gap-2.5 rounded-row bg-danger-bg px-3.5 py-2.5 font-bold text-danger"
        data-testid="syllabus-delete-confirm"
        data-entity-id={id}
        data-state="blocked"
      >
        <span>{blocked}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirm(null)}
          data-testid="syllabus-delete-cancel-btn"
        >
          OK
        </Button>
      </div>
    ) : (
      <InlineConfirm
        open
        testId="syllabus-delete"
        title={`Delete ${name}?`}
        message="This cannot be undone from here."
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => doDelete(kind, id, name)}
      />
    );

  const canEditCourse = perms.can('course.update');
  const canEditSubject = perms.can('subject.update');

  return (
    <PageRoot testId="page-syllabus" ready={!tree.isPending} className="flex flex-col gap-[18px]">
      <PageHeader
        breadcrumb={[{ label: 'Courses' }]}
        title="Courses"
        description="Courses, their subjects and topics in one place. Questions, classes and materials are filed against them."
        actions={
          perms.can('course.create') && (
            <Link
              to={`${base}/courses/new`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-[18px] font-bold text-on-primary hover:no-underline"
              data-testid="syllabus-add-course-btn"
            >
              <Icon name="plus" size={16} />
              Add course
            </Link>
          )
        }
      />
      <section
        className="flex flex-col gap-3.5 rounded-card bg-surface p-[22px]"
        data-testid="syllabus-card"
      >
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex min-w-0 flex-[2_1_220px] flex-col gap-1.5">
            <label htmlFor="syl-search" className="text-xs font-bold text-muted">
              Search courses
            </label>
            <input
              id="syl-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses, subjects or topics"
              className="h-[46px] w-full rounded-input border-[1.5px] border-border bg-surface-2 px-3.5"
              data-testid="syllabus-search-input"
            />
          </div>
          <p
            className="m-0 flex-[1_1_200px] self-center text-xs font-semibold text-muted"
            data-testid="syllabus-counts"
          >
            {counts.courses} courses · {counts.subjects} subjects · {counts.topics} topics
          </p>
        </div>

        {tree.isError ? (
          <div
            className="flex flex-col items-center gap-2 py-7 text-center text-muted"
            data-testid="syllabus-error"
          >
            <b className="text-ink">Could not load your courses</b>
            {errorText(tree.error)}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void tree.refetch()}
              data-testid="syllabus-retry-btn"
            >
              Try again
            </Button>
          </div>
        ) : tree.isPending ? (
          <p className="py-7 text-center text-muted" data-testid="syllabus-loading">
            Loading courses…
          </p>
        ) : (
          <div className="flex flex-col gap-2" data-testid="syllabus-tree">
            {visible.map((c, ci) => {
              const subjects = (subjectsOf.get(c.id) ?? []).filter(
                (s) => match(c.name) || subjectMatches(s),
              );
              const all = subjectsOf.get(c.id) ?? [];
              const qn = all.reduce((a, s) => a + s.questionCount, 0);
              const cOpen = isOpen(c.id, ci);
              const real = c.id !== NO_COURSE;
              return (
                <div key={c.id} className="flex flex-col gap-2">
                  {confirm === c.id ? (
                    confirmRow(
                      c.id,
                      'course',
                      c.name,
                      all.length
                        ? `${c.name} has ${all.length} ${all.length === 1 ? 'subject' : 'subjects'}. Delete or move them before deleting the course.`
                        : null,
                    )
                  ) : (
                    <div
                      className="flex min-h-[52px] flex-wrap items-center gap-2.5 rounded-row bg-lav px-3 py-2.5"
                      data-testid="syllabus-course-row"
                      data-entity-id={c.id}
                      data-entity-code={c.code}
                      data-expanded={cOpen}
                    >
                      <button
                        type="button"
                        className={iconBtn}
                        onClick={() => toggle(c.id, ci)}
                        aria-expanded={cOpen}
                        aria-label={`${cOpen ? 'Collapse' : 'Expand'} ${c.name}`}
                        data-testid="syllabus-course-toggle-btn"
                      >
                        <Chevron open={cOpen} />
                      </button>
                      <span
                        className="rounded-lg bg-surface px-2 py-[3px] text-[11px] font-extrabold tracking-[.06em]"
                        data-testid="syllabus-course-code"
                      >
                        {c.code}
                      </span>
                      <span className="min-w-0 flex-[1_1_160px] font-bold">
                        <NodeName
                          name={c.name}
                          renaming={renaming === c.id}
                          onSave={(v) => doRename('course', c.id, v)}
                          onCancel={() => setRenaming(null)}
                        />
                      </span>
                      <span className="text-xs font-semibold text-lav-ink">
                        {all.length} subjects · {qn} questions
                      </span>
                      {real && canEditCourse && (
                        <>
                          <Link
                            to={`${base}/courses/${c.id}/edit`}
                            className={iconBtn}
                            aria-label={`Edit ${c.name}`}
                            data-testid="syllabus-course-edit-btn"
                          >
                            <Icon name="settings" size={16} />
                          </Link>
                          <button
                            type="button"
                            className={iconBtn}
                            onClick={() => setRenaming(c.id)}
                            aria-label={`Rename ${c.name}`}
                            data-testid="syllabus-course-rename-btn"
                          >
                            <Icon name="edit" size={16} />
                          </button>
                        </>
                      )}
                      {real && perms.can('course.delete') && (
                        <button
                          type="button"
                          className={iconBtn}
                          onClick={() => setConfirm(c.id)}
                          aria-label={`Delete ${c.name}`}
                          data-testid="syllabus-course-delete-btn"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  {cOpen && (
                    <div className="ml-[18px] flex flex-col gap-2 border-l-2 border-border pl-7">
                      {subjects.map((s, si) => {
                        const sOpen = isOpen(s.id, si);
                        const topics = topicsOf.get(s.id) ?? [];
                        return (
                          <div key={s.id} className="flex flex-col gap-2">
                            {confirm === s.id ? (
                              confirmRow(
                                s.id,
                                'subject',
                                s.name,
                                s.questionCount
                                  ? `${s.name} has ${s.questionCount} questions. Move them before deleting.`
                                  : topics.length
                                    ? `${s.name} has ${topics.length} topics. Delete them before deleting the subject.`
                                    : null,
                              )
                            ) : (
                              <div
                                className="flex min-h-[52px] flex-wrap items-center gap-2.5 rounded-row bg-row px-3 py-2.5"
                                data-testid="syllabus-subject-row"
                                data-entity-id={s.id}
                                data-entity-code={s.code}
                                data-expanded={sOpen}
                              >
                                <button
                                  type="button"
                                  className={iconBtn}
                                  onClick={() => toggle(s.id, si)}
                                  aria-expanded={sOpen}
                                  aria-label={`${sOpen ? 'Collapse' : 'Expand'} ${s.name}`}
                                  data-testid="syllabus-subject-toggle-btn"
                                >
                                  <Chevron open={sOpen} />
                                </button>
                                <span className="rounded-lg bg-bg px-2 py-[3px] text-[11px] font-extrabold tracking-[.06em]">
                                  {s.code}
                                </span>
                                <span className="min-w-0 flex-[1_1_160px] font-bold">
                                  <NodeName
                                    name={s.name}
                                    renaming={renaming === s.id}
                                    onSave={(v) => doRename('subject', s.id, v)}
                                    onCancel={() => setRenaming(null)}
                                  />
                                </span>
                                <span className="text-xs font-semibold text-muted">
                                  {topics.length} topics · {s.questionCount} questions
                                </span>
                                {canEditSubject && (
                                  <>
                                    <Link
                                      to={`${base}/subjects/${s.id}/edit`}
                                      className={iconBtn}
                                      aria-label={`Edit ${s.name}`}
                                      data-testid="syllabus-subject-edit-btn"
                                    >
                                      <Icon name="settings" size={16} />
                                    </Link>
                                    <button
                                      type="button"
                                      className={iconBtn}
                                      onClick={() => setRenaming(s.id)}
                                      aria-label={`Rename ${s.name}`}
                                      data-testid="syllabus-subject-rename-btn"
                                    >
                                      <Icon name="edit" size={16} />
                                    </button>
                                  </>
                                )}
                                {perms.can('subject.delete') && (
                                  <button
                                    type="button"
                                    className={iconBtn}
                                    onClick={() => setConfirm(s.id)}
                                    aria-label={`Delete ${s.name}`}
                                    data-testid="syllabus-subject-delete-btn"
                                  >
                                    <Icon name="trash" size={16} />
                                  </button>
                                )}
                              </div>
                            )}
                            {sOpen && (
                              <div
                                className="flex flex-wrap gap-2 py-1 pl-7"
                                data-testid="syllabus-topic-list"
                              >
                                {topics.map((t) => (
                                  <span
                                    key={t.id}
                                    className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-surface py-1 pl-3 pr-1.5 text-[13px] font-semibold"
                                    data-testid="syllabus-topic-chip"
                                    data-entity-id={t.id}
                                  >
                                    {perms.can('topic.update') ? (
                                      <Link
                                        to={`${base}/topics/${t.id}/edit`}
                                        className="font-semibold text-ink"
                                        data-testid="syllabus-topic-edit-link"
                                      >
                                        {t.name}
                                      </Link>
                                    ) : (
                                      t.name
                                    )}
                                    {t.questionCount > 0 && (
                                      <span className="text-xs text-muted">
                                        · {t.questionCount} Q
                                      </span>
                                    )}
                                    {perms.can('topic.delete') && (
                                      <button
                                        type="button"
                                        className="inline-grid h-7 w-7 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink"
                                        onClick={() => deleteTopic(t)}
                                        aria-label={`Delete topic ${t.name}`}
                                        data-testid="syllabus-topic-delete-btn"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))}
                                {perms.can('topic.create') && (
                                  <Link
                                    to={`${base}/subjects/${s.id}/topics/new`}
                                    className="inline-flex items-center rounded-full border-[1.5px] border-dashed border-border px-3 py-1.5 text-[13px] font-semibold text-accent hover:no-underline"
                                    data-testid="syllabus-add-topic-btn"
                                  >
                                    + Add topic
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {real && perms.can('subject.create') && (
                        <Link
                          to={`${base}/courses/${c.id}/subjects/new`}
                          className={addLink}
                          data-testid="syllabus-add-subject-btn"
                        >
                          <Icon name="plus" size={16} />
                          Add subject to {c.name}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {visible.length === 0 && (
              <div
                className="flex flex-col items-center gap-2 py-7 text-center text-muted"
                data-testid="syllabus-empty"
              >
                {q ? (
                  <>
                    <b className="text-ink">Nothing matches “{search}”</b>Try a shorter word.
                  </>
                ) : (
                  <>
                    <b className="text-ink">No courses yet</b>Add your first course to start.
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {perms.can('course.create') && (
          <Link
            to={`${base}/courses/new`}
            className={addLink}
            data-testid="syllabus-add-course-row-btn"
          >
            <Icon name="plus" size={16} />
            Add course
          </Link>
        )}
      </section>
    </PageRoot>
  );
}
