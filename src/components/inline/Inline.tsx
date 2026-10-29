// PURPOSE: InlinePanel and InlineConfirm: forms and confirmations shown inside the page, where the user is working.
// WHY: The product has no pop-ups. "Add" forms open above the list, edit forms and delete confirmations open under
//      the row (DataTable expandedRow). Same props as the old Modal / ConfirmDialog, so screens switch over 1:1.
//      Esc closes, focus moves into the panel and comes back to the button that opened it.
// DEPENDS ON: components/ui/Button.tsx, Icon.tsx, utils/cn.ts.

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

// A form field first; the header's close button comes before the fields in the page, so buttons are the fallback.
const FIELD = 'input:not([disabled]),select:not([disabled]),textarea:not([disabled])';
const ANY_FOCUSABLE = 'button:not([disabled]),a[href]';

/** Moves focus into `root` when it opens ([data-autofocus], else `preferred`, else the first field), scrolls it into
 *  view, and gives focus back to whatever had it before when it closes. */
function useFocusOnOpen(root: React.RefObject<HTMLElement | null>, preferred?: string) {
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const el = root.current;
    el?.scrollIntoView?.({ block: 'nearest' });
    (
      el?.querySelector<HTMLElement>('[data-autofocus]') ??
      (preferred ? el?.querySelector<HTMLElement>(preferred) : null) ??
      el?.querySelector<HTMLElement>(FIELD) ??
      el?.querySelector<HTMLElement>(ANY_FOCUSABLE)
    )?.focus();
    return () => {
      if (before && document.contains(before)) before.focus();
    };
  }, [root, preferred]);
}

interface InlinePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Root locator, e.g. "course-form"; its close button is <testId>-close-btn. */
  testId?: string;
  className?: string;
  /** Accepted so former Modal call sites keep compiling; an inline panel always takes the width it is given. */
  size?: 'sm' | 'md' | 'lg';
}

/** A form or detail view shown inside the page. Renders nothing while closed. */
export function InlinePanel(props: InlinePanelProps) {
  return props.open ? <OpenPanel {...props} /> : null;
}

function OpenPanel({
  onClose,
  title,
  children,
  footer,
  testId = 'inline-panel',
  className,
}: InlinePanelProps) {
  const titleId = useId();
  const root = useRef<HTMLElement>(null);
  useFocusOnOpen(root);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };
  return (
    <section
      ref={root}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      data-testid={testId}
      className={cn(
        'rounded-tile border-2 border-focus bg-surface shadow-[0_12px_30px_color-mix(in_srgb,var(--focus)_16%,transparent)]',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 px-[18px] pt-[18px]">
        <h2 id={titleId} className="font-extrabold">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Close ${title}`}
          data-testid={`${testId}-close-btn`}
          onClick={onClose}
        >
          <Icon name="close" />
        </Button>
      </header>
      <div className="p-[18px]">{children}</div>
      {footer && (
        <footer className="flex flex-wrap justify-end gap-2 px-[18px] pb-[18px]">{footer}</footer>
      )}
    </section>
  );
}

interface InlineConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Locator prefix: "course-delete" gives course-delete-confirm, -cancel-btn and -confirm-btn. */
  testId?: string;
  className?: string;
}

/** "Delete this course?" asked in place (under the row, or next to the button). Focus goes to Cancel; Esc cancels. */
export function InlineConfirm(props: InlineConfirmProps) {
  return props.open ? <OpenConfirm {...props} /> : null;
}

function OpenConfirm({
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
  testId = 'delete',
  className,
}: InlineConfirmProps) {
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  useFocusOnOpen(root, '[data-cancel]');
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };
  return (
    <div
      ref={root}
      role="group"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      data-testid={`${testId}-confirm`}
      data-state={tone}
      className={cn(
        'flex flex-wrap items-center justify-between gap-2.5 rounded-row px-3.5 py-2.5 font-bold',
        tone === 'danger' ? 'bg-danger-bg text-danger' : 'bg-butter text-butter-ink',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p id={titleId}>{title}</p>
        <div className="mt-0.5 text-[13px] font-medium opacity-90">{message}</div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          data-cancel
          data-testid={`${testId}-cancel-btn`}
        >
          Cancel
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          size="sm"
          loading={Boolean(loading)}
          onClick={onConfirm}
          data-testid={`${testId}-confirm-btn`}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
