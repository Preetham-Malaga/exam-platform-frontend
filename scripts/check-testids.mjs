// PURPOSE: CI guard for the data-testid locator contract (docs/locators.md).
// WHY: QA automation depends on stable ids; this fails the build when new interactive elements ship without one,
//      or when the same literal id is used twice in one file (ids must be unique per page; repeated rows use one
//      id written once inside a .map, plus data-entity-id).
// HOW: Parses every .tsx under src/ with the TypeScript compiler. An element passes when it has data-testid, or a
//      {...rest} spread of a props variable (the shared component forwards its caller's id; the caller is checked).
//      Screens not yet converted are listed in scripts/testid-baseline.json (missing count per file). A file may
//      only go DOWN from its baseline; new files must be complete. After converting a screen run
//      `npm run check:testids -- --update` and commit the smaller baseline.
// USAGE: npm run check:testids [-- --update] [-- --list]

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'scripts', 'testid-baseline.json');
const update = process.argv.includes('--update');
const list = process.argv.includes('--list');

// Dev-only gallery is not part of the product (not routed in production).
const SKIP_DIRS = [path.join('src', 'pages', 'dev')];
const INTRINSIC = new Set(['button', 'a', 'input', 'select', 'textarea', 'option']);
const ROLES = new Set(['tab', 'menuitem']);
// Shared components that render one of the above and need the id from their caller.
const COMPONENTS = new Set([
  'Button',
  'Input',
  'PasswordInput',
  'Select',
  'Textarea',
  'Checkbox',
  'Radio',
  'Link',
  'NavLink',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.some((s) => full.endsWith(s))) walk(full, out);
    } else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function attr(node, name) {
  return node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === name);
}

function literal(a) {
  const init = a?.initializer;
  if (!init) return null;
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression && ts.isStringLiteralLike(init.expression))
    return init.expression.text;
  return null;
}

function check(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const missing = [];
  const seen = new Map();
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const role = literal(attr(node, 'role'));
      const interactive = INTRINSIC.has(tag) || COMPONENTS.has(tag) || ROLES.has(role ?? '');
      const idAttr = attr(node, 'data-testid');
      // Only a spread of a props variable ({...rest}) forwards the caller's id; {...register('x')} does not.
      const spreads = node.attributes.properties.some(
        (p) => ts.isJsxSpreadAttribute(p) && ts.isIdentifier(p.expression),
      );
      if (interactive && !idAttr && !spreads) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        missing.push(`${line + 1}: <${tag}${role ? ` role="${role}"` : ''}>`);
      }
      const id = literal(idAttr);
      if (id) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        seen.set(id, [...(seen.get(id) ?? []), line + 1]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  const duplicates = [...seen].filter(([, lines]) => lines.length > 1);
  return { missing, duplicates };
}

const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : {};
const next = {};
const failures = [];
let total = 0;

for (const file of walk(path.join(root, 'src')).sort()) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const { missing, duplicates } = check(file);
  total += missing.length;
  if (missing.length) next[rel] = missing.length;
  for (const [id, lines] of duplicates)
    failures.push(`${rel}: data-testid="${id}" is used more than once (lines ${lines.join(', ')})`);
  const allowed = baseline[rel] ?? 0;
  if (!update && missing.length > allowed) {
    failures.push(
      `${rel}: ${missing.length} interactive element(s) without data-testid (baseline allows ${allowed})\n    ` +
        missing.join('\n    '),
    );
  } else if (list && missing.length) {
    process.stdout.write(`${rel}\n    ${missing.join('\n    ')}\n`);
  }
}

if (update) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  process.stdout.write(`Baseline written: ${total} element(s) still without data-testid.\n`);
}
if (failures.length) {
  process.stderr.write(`data-testid check failed:\n\n${failures.join('\n\n')}\n\n`);
  process.stderr.write(
    'Add a data-testid (see docs/locators.md). If you converted a screen, run `npm run check:testids -- --update`.\n',
  );
  process.exit(1);
}
const shrunk = Object.keys(baseline).filter((f) => (next[f] ?? 0) < baseline[f]);
if (!update && shrunk.length)
  process.stdout.write(
    `Good: fewer missing ids in ${shrunk.length} file(s). Run with --update to lock in the progress.\n`,
  );
process.stdout.write(`data-testid check passed (${total} element(s) still in the baseline).\n`);
