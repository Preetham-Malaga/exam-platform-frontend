// PURPOSE: Dropdown menu (button + role=menu) with keyboard support and click-outside close.
// WHY: Row actions and the user menu need an accessible menu; native <select> cannot hold actions.
// DEPENDS ON: utils/cn.ts.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Dropdown({
  trigger,
  items,
  label,
  align = 'right',
}: {
  trigger: ReactNode;
  items: MenuItem[];
  label: string;
  align?: 'left' | 'right';
}) {
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
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-text"
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            'absolute z-40 mt-1 min-w-44 rounded-lg border border-border bg-card py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              type="button"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={cn(
                'block w-full px-3 py-2 text-left text-sm hover:bg-background disabled:opacity-50',
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
