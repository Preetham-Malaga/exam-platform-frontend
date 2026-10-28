// Runtime check of the locator contract on a rendered page: a data-testid may repeat only on items that identify
// themselves (data-entity-id for rows/cards, data-value for options). Complements scripts/check-testids.mjs.
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
    return [...groups]
      .filter(
        ([, els]) =>
          els.length > 1 &&
          !els.every((e) => e.hasAttribute('data-entity-id') || e.hasAttribute('data-value')),
      )
      .map(([id, els]) => `${id} ×${els.length}`);
  }, within);
  expect(clashes, 'data-testid values repeated without data-entity-id/data-value').toEqual([]);
}
