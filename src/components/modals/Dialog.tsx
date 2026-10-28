// PURPOSE: Accessible Modal, Drawer and ConfirmDialog built on one Dialog (focus trap, Esc, focus return, aria-modal).
// WHY: Dialogs are the most common accessibility failure; implementing it once means every dialog behaves correctly.
// DEPENDS ON: components/ui/Button.tsx, Icon.tsx, utils/cn.ts.

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'center' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlay?: boolean;
  /** Root locator (e.g. "course-form-dialog"); its close button is <testId>-close-btn. */
  testId?: string;
}

function Dialog({
  testId = 'dialog',
  open,
  onClose,
  title,
  children,
  footer,
  side = 'center',
  size = 'md',
  closeOnOverlay = true,
}: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  // Keep the latest onClose in a ref: the focus/keyboard effect must depend on `open` only, otherwise every parent re-render
  // (which creates a new onClose function) would re-run it and steal focus from the field the user is typing in.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE) ??
      panel
    )?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      returnTo.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' }[size];
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex',
        side === 'center'
          ? 'items-center justify-center p-4'
          : side === 'right'
            ? 'justify-end'
            : 'justify-start',
      )}
    >
      <div
        className="absolute inset-0 bg-text/50"
        aria-hidden="true"
        onClick={closeOnOverlay ? onClose : undefined}
        data-testid="dialog-overlay"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
        className={cn(
          'relative flex max-h-full w-full flex-col bg-card shadow-xl focus:outline-none',
          side === 'center' ? cn('rounded-card', width) : 'h-full max-w-xs',
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 id={titleId} className="text-base font-semibold text-text">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close dialog"
            data-testid={`${testId}-close-btn`}
            onClick={onClose}
          >
            <Icon name="close" />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Modal(props: Omit<DialogProps, 'side'>) {
  return <Dialog {...props} side="center" />;
}

export function Drawer(props: Omit<DialogProps, 'side' | 'size'> & { side?: 'left' | 'right' }) {
  return <Dialog {...props} side={props.side ?? 'right'} />;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
  testId = 'confirm',
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Locator prefix: "exam-delete" gives exam-delete-dialog, exam-delete-cancel-btn, exam-delete-confirm-btn. */
  testId?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      testId={`${testId}-dialog`}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onCancel}
            data-autofocus
            data-testid={`${testId}-cancel-btn`}
          >
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={Boolean(loading)}
            onClick={onConfirm}
            data-testid={`${testId}-confirm-btn`}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-text">{message}</div>
    </Modal>
  );
}
