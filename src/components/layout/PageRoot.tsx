// PURPOSE: Root element of a screen carrying its locator (page-<name>) and the data-ready signal for automated tests.
// WHY: Tests wait for data-ready="true" (data loaded) instead of sleeping; see docs/locators.md.
// DEPENDS ON: nothing. Adds no styling, so wrapping a page never changes how it looks.

import type { ReactNode } from 'react';

export function PageRoot({
  testId,
  ready = true,
  children,
  className,
}: {
  /** "page-<name>", e.g. page-login, page-exams. */
  testId: `page-${string}`;
  /** False while the page's first data is loading; true once it is shown (or failed with an error state). */
  ready?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-testid={testId} data-ready={ready ? 'true' : 'false'} className={className}>
      {children}
    </div>
  );
}
