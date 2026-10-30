// CSS selector for a data-testid. Every locator constant is built with this so the format stays in one place.
export const tid = (id: string) => `[data-testid="${id}"]`;

/** A repeated item (row, card, option) picked by its database id. */
export const byEntity = (id: string, entityId: string) =>
  `[data-testid="${id}"][data-entity-id="${entityId}"]`;
