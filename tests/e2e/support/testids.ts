// Runtime check of the locator contract on a rendered page. A data-testid may repeat only when every copy can be told
// apart: it carries data-entity-id / data-value itself (rows, cards, options), or it sits inside a different
// [data-entity-id] item (static child ids such as row-actions-menu-btn, scoped row → child). Complements
// scripts/check-testids.mjs.
import { expect, type Page } from '@playwright/test';

/** `within`: CSS selector of the parts to check (default the whole page). Screens not yet converted are left out. */
export async function expectUniqueTestIds(page: Page, within = 'body'): Promise<void> {
  const clashes = await page.evaluate((scope) => {
    const groups = new Map<string, Element[]>();
    for (const root of document.querySelectorAll(scope))
      for (const el of root.querySelectorAll('[data-testid]')) {
        const id = el.getAttribute('data-testid')!;
        groups.set(id, [...(groups.get(id) ?? []), el]);
      }
    const key = (e: Element) => {
      if (e.hasAttribute('data-entity-id') || e.hasAttribute('data-value'))
        return `self:${e.getAttribute('data-entity-id') ?? e.getAttribute('data-value')}`;
      const owner = e.parentElement?.closest('[data-entity-id]');
      return owner
        ? `in:${owner.getAttribute('data-testid')}:${owner.getAttribute('data-entity-id')}`
        : null;
    };
    return [...groups]
      .filter(([, els]) => {
        if (els.length < 2) return false;
        const keys = els.map(key);
        return keys.includes(null) || new Set(keys).size !== keys.length;
      })
      .map(([id, els]) => `${id} ×${els.length}`);
  }, within);
  expect(clashes, 'data-testid values repeated without data-entity-id/data-value').toEqual([]);
}
