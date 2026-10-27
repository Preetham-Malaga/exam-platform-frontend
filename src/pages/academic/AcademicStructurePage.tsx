// PURPOSE: /org/academic - the organization's own hierarchy: level names in order (Program > Branch > Year ...) and the
//          tree of units (B.Tech > EEE > Year 2 ...). Owners and admins (academic.manage) only.
// WHY: One configurable structure for every institution type (guide Part 7). The API enforces the rules (a child sits on a
//      lower level than its parent, nothing in use is deleted); the screen offers only choices that can succeed.
// DEPENDS ON: features/academic/*, shared layout/form/dialog components.

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select } from '@/components/forms/Form';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog, Modal } from '@/components/modals/Dialog';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useAcademicMutation, useLevels, useUnitTree } from '@/features/academic/hooks';
import {
  levelSchema,
  unitSchema,
  type LevelValues,
  type UnitValues,
} from '@/features/academic/schemas';
import { buildTree, childLevels, type TreeNode } from '@/features/academic/tree';
import { errorText } from '@/features/academic/ui';
import { academicService } from '@/services/academicService';
import type { AcademicLevel, UnitNode } from '@/types/academic';

// ---------------- levels ----------------

function LevelsCard() {
  const { toast } = useToast();
  const levels = useLevels();
  const create = useAcademicMutation((name: string) => academicService.createLevel(name));
  const rename = useAcademicMutation((v: { id: string; name: string }) =>
    academicService.renameLevel(v.id, v.name),
  );
  const reorder = useAcademicMutation((ids: string[]) => academicService.reorderLevels(ids));
  const remove = useAcademicMutation((id: string) => academicService.deleteLevel(id));
  const [renaming, setRenaming] = useState<AcademicLevel | null>(null);
  const [deleting, setDeleting] = useState<AcademicLevel | null>(null);

  const addForm = useForm<LevelValues>({
    resolver: zodResolver(levelSchema),
    defaultValues: { name: '' },
  });
  const onAdd = addForm.handleSubmit((v) =>
    create.mutate(v.name, {
      onSuccess: () => {
        toast({ title: 'Level added', variant: 'success' });
        addForm.reset();
      },
      onError: (e) =>
        toast({ title: 'Could not add the level', description: errorText(e), variant: 'error' }),
    }),
  );

  const items = levels.data?.items ?? [];
  const move = (index: number, delta: -1 | 1) => {
    const ids = items.map((l) => l.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    reorder.mutate(ids, {
      onError: (e) =>
        toast({ title: 'Could not change the order', description: errorText(e), variant: 'error' }),
    });
  };

  return (
    <Card title="Levels">
      <p className="mb-3 text-sm text-muted">
        The names of your hierarchy, from the top. Units are created on these levels.
      </p>
      {levels.isPending ? (
        <LoadingState compact />
      ) : levels.isError ? (
        <ErrorState
          compact
          message={errorText(levels.error)}
          onRetry={() => void levels.refetch()}
        />
      ) : (
        <ol className="grid gap-2" aria-label="Levels in order">
          {items.map((l, i) => (
            <li
              key={l.id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="w-5 text-xs text-muted">{i + 1}.</span>
              <span className="flex-1 font-medium text-text">{l.name}</span>
              <Badge tone="neutral">
                {l.unitCount} {l.unitCount === 1 ? 'unit' : 'units'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Move ${l.name} up`}
                disabled={i === 0 || reorder.isPending}
                onClick={() => move(i, -1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Move ${l.name} down`}
                disabled={i === items.length - 1 || reorder.isPending}
                onClick={() => move(i, 1)}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Rename ${l.name}`}
                onClick={() => setRenaming(l)}
              >
                <Icon name="edit" size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${l.name}`}
                disabled={l.unitCount > 0}
                title={l.unitCount > 0 ? 'Units use this level' : undefined}
                onClick={() => setDeleting(l)}
              >
                <Icon name="trash" size={16} />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={onAdd} noValidate className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="New level"
            placeholder="e.g. Section"
            error={addForm.formState.errors.name?.message}
            {...addForm.register('name')}
          />
        </div>
        <Button type="submit" loading={create.isPending} leftIcon={<Icon name="plus" size={16} />}>
          Add level
        </Button>
      </form>

      <RenameLevelModal
        level={renaming}
        onClose={() => setRenaming(null)}
        saving={rename.isPending}
        onSave={(name) =>
          renaming &&
          rename.mutate(
            { id: renaming.id, name },
            {
              onSuccess: () => {
                toast({ title: 'Level renamed', variant: 'success' });
                setRenaming(null);
              },
              onError: (e) =>
                toast({
                  title: 'Could not rename the level',
                  description: errorText(e),
                  variant: 'error',
                }),
            },
          )
        }
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this level?"
        confirmLabel="Delete level"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast({ title: 'Level deleted', variant: 'success' });
              setDeleting(null);
            },
            onError: (e) => {
              toast({
                title: 'Could not delete the level',
                description: errorText(e),
                variant: 'error',
              });
              setDeleting(null);
            },
          })
        }
        message={
          deleting && (
            <>
              <strong>{deleting.name}</strong> will be removed from your hierarchy.
            </>
          )
        }
      />
    </Card>
  );
}

function RenameLevelModal({
  level,
  onClose,
  onSave,
  saving,
}: {
  level: AcademicLevel | null;
  onClose: () => void;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const form = useForm<LevelValues>({
    resolver: zodResolver(levelSchema),
    values: { name: level?.name ?? '' },
  });
  return (
    <Modal
      open={Boolean(level)}
      onClose={onClose}
      title="Rename level"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rename-level-form" loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <form id="rename-level-form" noValidate onSubmit={form.handleSubmit((v) => onSave(v.name))}>
        <Input
          label="Level name"
          required
          data-autofocus
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
      </form>
    </Modal>
  );
}

// ---------------- units ----------------

type UnitDialog = { mode: 'create'; parent: UnitNode | null } | { mode: 'edit'; unit: UnitNode };

function UnitModal({
  dialog,
  levels,
  onClose,
}: {
  dialog: UnitDialog | null;
  levels: AcademicLevel[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const create = useAcademicMutation(
    (v: { levelId: string; parentId: string | null; code: string; name: string }) =>
      academicService.createUnit(v),
  );
  const update = useAcademicMutation((v: { id: string } & Omit<UnitValues, 'levelId'>) =>
    academicService.updateUnit(v.id, { code: v.code, name: v.name, status: v.status }),
  );
  const editing = dialog?.mode === 'edit' ? dialog.unit : null;
  const parent = dialog?.mode === 'create' ? dialog.parent : null;
  const allowed = editing ? levels : childLevels(levels, parent);

  const form = useForm<UnitValues>({
    resolver: zodResolver(unitSchema),
    values: {
      levelId: editing?.levelId ?? allowed[0]?.id ?? '',
      code: editing?.code ?? '',
      name: editing?.name ?? '',
      status: editing?.status ?? 'active',
    },
  });
  const close = () => {
    form.reset();
    onClose();
  };
  const fail = (title: string) => (e: unknown) =>
    toast({ title, description: errorText(e), variant: 'error' });

  const onSubmit = form.handleSubmit((v) => {
    if (editing)
      update.mutate(
        { id: editing.id, code: v.code, name: v.name, status: v.status },
        {
          onSuccess: () => {
            toast({ title: 'Unit updated', variant: 'success' });
            close();
          },
          onError: fail('Could not update the unit'),
        },
      );
    else
      create.mutate(
        { levelId: v.levelId, code: v.code, name: v.name, parentId: parent?.id ?? null },
        {
          onSuccess: () => {
            toast({ title: 'Unit added', variant: 'success' });
            close();
          },
          onError: fail('Could not add the unit'),
        },
      );
  });

  const title = editing
    ? `Edit ${editing.name}`
    : parent
      ? `Add a unit under ${parent.name}`
      : 'Add a top-level unit';
  return (
    <Modal
      open={Boolean(dialog)}
      onClose={close}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="unit-form" loading={create.isPending || update.isPending}>
            {editing ? 'Save' : 'Add unit'}
          </Button>
        </>
      }
    >
      <form id="unit-form" noValidate onSubmit={onSubmit} className="grid gap-4">
        <Select
          label="Level"
          required
          disabled={Boolean(editing)}
          options={allowed.map((l) => ({ value: l.id, label: l.name }))}
          error={form.formState.errors.levelId?.message}
          {...form.register('levelId')}
        />
        <Input
          label="Name"
          required
          data-autofocus
          placeholder="e.g. Electrical Engineering"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Input
          label="Code"
          required
          placeholder="e.g. EEE"
          hint="Unique in your organization."
          error={form.formState.errors.code?.message}
          {...form.register('code')}
        />
        {editing && (
          <Select
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            {...form.register('status')}
          />
        )}
      </form>
    </Modal>
  );
}

function UnitRow({
  node,
  levels,
  onAdd,
  onEdit,
  onDelete,
}: {
  node: TreeNode;
  levels: AcademicLevel[];
  onAdd: (u: UnitNode) => void;
  onEdit: (u: UnitNode) => void;
  onDelete: (u: UnitNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const level = levels.find((l) => l.id === node.levelId);
  const canHaveChildren = childLevels(levels, node).length > 0;
  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-background"
        style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            className="w-5 text-muted"
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="font-medium text-text">{node.name}</span>
        <span className="text-xs text-muted">{node.code}</span>
        {level && <Badge tone="info">{level.name}</Badge>}
        {node.status !== 'active' && <StatusBadge status={node.status} />}
        <span className="ml-auto flex gap-1">
          {canHaveChildren && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Add a unit under ${node.name}`}
              onClick={() => onAdd(node)}
            >
              <Icon name="plus" size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${node.name}`}
            onClick={() => onEdit(node)}
          >
            <Icon name="edit" size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${node.name}`}
            onClick={() => onDelete(node)}
          >
            <Icon name="trash" size={16} />
          </Button>
        </span>
      </div>
      {open && node.children.length > 0 && (
        <ul>
          {node.children.map((c) => (
            <UnitRow
              key={c.id}
              node={c}
              levels={levels}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function UnitsCard() {
  const { toast } = useToast();
  const tree = useUnitTree();
  const remove = useAcademicMutation((id: string) => academicService.deleteUnit(id));
  const [dialog, setDialog] = useState<UnitDialog | null>(null);
  const [deleting, setDeleting] = useState<UnitNode | null>(null);
  const roots = useMemo(() => buildTree(tree.data?.units ?? []), [tree.data]);
  const levels = tree.data?.levels ?? [];

  return (
    <Card
      title="Units"
      actions={
        <Button
          size="sm"
          leftIcon={<Icon name="plus" size={16} />}
          disabled={!levels.length}
          onClick={() => setDialog({ mode: 'create', parent: null })}
        >
          Add top-level unit
        </Button>
      }
    >
      {tree.isPending ? (
        <LoadingState compact />
      ) : tree.isError ? (
        <ErrorState compact message={errorText(tree.error)} onRetry={() => void tree.refetch()} />
      ) : roots.length === 0 ? (
        <EmptyState
          title="No units yet"
          description={
            levels[0]
              ? `Start with a ${levels[0].name.toLowerCase()}, for example "B.Tech".`
              : 'Add a level first.'
          }
          icon="layers"
        />
      ) : (
        <>
          {tree.data?.truncated && (
            <p className="mb-2 text-sm text-warning">Showing the first 5000 units only.</p>
          )}
          <ul aria-label="Academic units">
            {roots.map((n) => (
              <UnitRow
                key={n.id}
                node={n}
                levels={levels}
                onAdd={(u) => setDialog({ mode: 'create', parent: u })}
                onEdit={(u) => setDialog({ mode: 'edit', unit: u })}
                onDelete={setDeleting}
              />
            ))}
          </ul>
        </>
      )}

      <UnitModal dialog={dialog} levels={levels} onClose={() => setDialog(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this unit?"
        confirmLabel="Delete unit"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast({ title: 'Unit deleted', variant: 'success' });
              setDeleting(null);
            },
            onError: (e) => {
              toast({
                title: 'Could not delete the unit',
                description: errorText(e),
                variant: 'error',
              });
              setDeleting(null);
            },
          })
        }
        message={
          deleting && (
            <>
              <strong>{deleting.name}</strong> will be removed. A unit that still has sub-units,
              courses, subjects or students cannot be deleted.
            </>
          )
        }
      />
    </Card>
  );
}

export default function AcademicStructurePage() {
  return (
    <>
      <PageHeader
        title="Academic Structure"
        description="How your institution is organized. Courses, subjects and students are placed on these units."
        breadcrumb={[{ label: 'Content Management' }, { label: 'Academic Structure' }]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <LevelsCard />
        <UnitsCard />
      </div>
    </>
  );
}
