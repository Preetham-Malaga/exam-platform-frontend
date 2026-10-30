// PURPOSE: /org/batches - the prototype's Batches screen (vBatches): one coloured tile per batch with its code, name,
//          students and course, plus an "Add batch" tile. A tile opens that batch's students; Edit and Delete sit on it.
// WHY: Batches are how students are grouped. Add and edit open their own page; delete is confirmed in place and refused
//      by the API while students are still in the batch.
// DEPENDS ON: features/batches/batches.ts.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { InlineConfirm } from '@/components/inline/Inline';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { errorText } from '@/features/academic/ui';
import { batchService, useBatchMutation, useBatches, type Batch } from '@/features/batches/batches';
import { cn } from '@/utils/cn';

const TONES = [
  'bg-lav [&_.lbl]:text-lav-ink',
  'bg-mint [&_.lbl]:text-mint-ink',
  'bg-peach [&_.lbl]:text-peach-ink',
  'bg-sky [&_.lbl]:text-sky-ink',
  'bg-butter [&_.lbl]:text-butter-ink',
  'bg-pink [&_.lbl]:text-pink-ink',
];
const iconBtn =
  'inline-grid h-8 w-8 place-items-center rounded-xl bg-surface/70 text-ink hover:bg-surface';

function Tile({ b, i }: { b: Batch; i: number }) {
  const perms = usePermissions();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const remove = useBatchMutation((id: string) => batchService.remove(id));
  if (confirm)
    return (
      <InlineConfirm
        open
        testId="batches-delete"
        title={`Delete ${b.name}?`}
        message={
          b.studentCount
            ? `${b.studentCount} students are in it; move them first.`
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          remove.mutate(b.id, {
            onSuccess: () => toast({ title: `${b.name} deleted`, variant: 'success' }),
            onError: (e) => {
              setConfirm(false);
              toast({
                title: 'Could not delete the batch',
                description: errorText(e),
                variant: 'error',
              });
            },
          })
        }
      />
    );
  return (
    <div
      className={cn(
        'flex min-h-[150px] flex-col justify-between gap-3.5 rounded-tile p-5',
        TONES[i % TONES.length],
      )}
      data-testid="batch-tile"
      data-entity-id={b.id}
      data-entity-code={b.code}
      data-state={b.status}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="rounded-lg bg-surface px-2 py-[3px] text-[11px] font-extrabold tracking-[.06em]">
          {b.code}
        </span>
        <span className="flex gap-1">
          {perms.can('student.update') && (
            <Link
              to={`/org/batches/${b.id}/edit`}
              className={iconBtn}
              aria-label={`Edit ${b.name}`}
              data-testid="batch-tile-edit-btn"
            >
              <Icon name="edit" size={14} />
            </Link>
          )}
          {perms.can('student.delete') && (
            <button
              type="button"
              className={iconBtn}
              onClick={() => setConfirm(true)}
              aria-label={`Delete ${b.name}`}
              data-testid="batch-tile-delete-btn"
            >
              <Icon name="trash" size={14} />
            </button>
          )}
        </span>
      </span>
      <Link
        to={`/org/students?batch=${b.id}`}
        className="text-xl font-extrabold text-ink"
        data-testid="batch-tile-students-link"
      >
        {b.name}
      </Link>
      <span className="lbl text-xs font-bold">
        {b.studentCount} students{b.courseName ? ` · ${b.courseName}` : ''}
        {b.academicYear ? ` · ${b.academicYear}` : ''}
        {b.status === 'inactive' ? ' · Inactive' : ''}
      </span>
    </div>
  );
}

export default function BatchesPage() {
  const perms = usePermissions();
  const q = useBatches();
  const items = q.data?.items ?? [];
  const total = items.reduce((a, b) => a + b.studentCount, 0);
  return (
    <PageRoot testId="page-batches" ready={!q.isPending} className="flex flex-col gap-[18px]">
      <PageHeader
        breadcrumb={[{ label: 'People' }, { label: 'Batches' }]}
        title="Batches"
        description="How students are grouped. Exams, classes and materials reach students through their batch."
        actions={
          perms.can('student.create') && (
            <Link
              to="/org/batches/new"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-[18px] font-bold text-on-primary hover:no-underline"
              data-testid="batches-add-btn"
            >
              <Icon name="plus" size={16} />
              Add batch
            </Link>
          )
        }
      />
      <section
        className="flex flex-col gap-3.5 rounded-card bg-surface p-[22px]"
        data-testid="batches-card"
      >
        <h2 className="font-display text-lg font-extrabold">
          All batches{' '}
          <span className="text-[13px] font-medium text-muted" data-testid="batches-summary">
            {items.length} batches · {total} students
          </span>
        </h2>
        {q.data && q.data.studentsWithoutBatch > 0 && (
          <div
            className="rounded-2xl bg-butter px-3.5 py-3 text-[13px] font-semibold text-butter-ink"
            data-testid="batches-no-batch-warning"
          >
            {q.data.studentsWithoutBatch}{' '}
            {q.data.studentsWithoutBatch === 1 ? 'student has' : 'students have'} no batch and won't
            receive batch-assigned exams, classes or materials.{' '}
            <Link to="/org/students?batch=none" data-testid="batches-no-batch-link">
              Show them
            </Link>
          </div>
        )}
        {q.isError ? (
          <p className="text-danger" data-testid="batches-error">
            {errorText(q.error)}
          </p>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {items.map((b, i) => (
              <Tile key={b.id} b={b} i={i} />
            ))}
            {perms.can('student.create') && (
              <Link
                to="/org/batches/new"
                className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-tile border-2 border-dashed border-dash bg-surface-2 font-extrabold text-accent hover:no-underline"
                data-testid="batches-add-tile-btn"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-[14px] bg-lav text-[22px] text-lav-ink"
                  aria-hidden="true"
                >
                  +
                </span>
                Add batch
              </Link>
            )}
          </div>
        )}
      </section>
    </PageRoot>
  );
}
