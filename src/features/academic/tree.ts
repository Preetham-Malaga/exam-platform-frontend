// PURPOSE: Turns the flat unit list from /academic-units/tree into nested nodes and readable paths ("B.Tech / EEE / Year 2").
// WHY: Pure functions, so the tree screen and every unit picker show the same structure, and it is easy to unit test.
// DEPENDS ON: types/academic.ts.

import type { AcademicLevel, UnitNode } from '@/types/academic';

export interface TreeNode extends UnitNode {
  children: TreeNode[];
  depth: number;
}

/** Nests units by parentId. Units whose parent is missing (e.g. truncated list) are shown as roots. */
export function buildTree(units: UnitNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const u of units) byId.set(u.id, { ...u, children: [], depth: 0 });
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const byName = (a: TreeNode, b: TreeNode) => a.name.localeCompare(b.name);
  const setDepth = (nodes: TreeNode[], depth: number) => {
    nodes.sort(byName);
    for (const n of nodes) {
      n.depth = depth;
      setDepth(n.children, depth + 1);
    }
  };
  setDepth(roots, 0);
  return roots;
}

/** Full path of a unit, root first. */
export function unitPath(units: UnitNode[], id: string): string {
  const byId = new Map(units.map((u) => [u.id, u]));
  const names: string[] = [];
  const seen = new Set<string>();
  let cur = byId.get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return names.join(' / ');
}

/** Options for a unit picker: every unit, labelled with its path, in tree order. */
export function unitOptions(units: UnitNode[]): Array<{ value: string; label: string }> {
  const out: Array<{ value: string; label: string }> = [];
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      out.push({ value: n.id, label: unitPath(units, n.id) });
      walk(n.children);
    }
  };
  walk(buildTree(units));
  return out;
}

/** Levels a child of `parent` may use: strictly below the parent's level (any level for a root unit). */
export function childLevels(levels: AcademicLevel[], parent: UnitNode | null): AcademicLevel[] {
  if (!parent) return levels;
  const parentPos = levels.find((l) => l.id === parent.levelId)?.position ?? 0;
  return levels.filter((l) => l.position > parentPos);
}
