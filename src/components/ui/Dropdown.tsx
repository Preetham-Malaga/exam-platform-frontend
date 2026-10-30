// PURPOSE: Dropdown menu (button + role=menu) with keyboard support and click-outside close.
// WHY: Row actions and the user menu need an accessible menu; native <select> cannot hold actions.
// DEPENDS ON: utils/cn.ts.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { slug } from '@/utils/testid';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Defaults to <menu>-<label>-menu-item; set it when the label may change (e.g. translated). */
  testId?: string;
}

export function Dropdown({
  trigger,
  items,
  label,
  align = 'right',
  testId,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  label: string;
  align?: 'left' | 'right';
  /** Locator prefix: "topbar-account" gives topbar-account-menu-btn, topbar-account-menu and its items. */
  testId?: string;
}) {
  const prefix = testId ?? slug(label);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = [
      ...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []),
    ];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      setOpen(false);
      root.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    }
  };

  return (
    <div ref={root} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        data-testid={`${prefix}-menu-btn`}
        data-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink"
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          data-testid={`${prefix}-menu`}
          onKeyDown={onMenuKey}
          className={cn(
            'absolute z-40 mt-1 min-w-44 rounded-row border border-border bg-surface p-1.5 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              type="button"
              disabled={it.disabled}
              data-testid={it.testId ?? `${prefix}-${slug(it.label)}-menu-item`}
              data-disabled={it.disabled || undefined}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={cn(
                'block w-full rounded-xl px-3 py-2 text-left font-semibold hover:bg-bg disabled:opacity-50',
                it.danger ? 'text-error' : 'text-text',
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
