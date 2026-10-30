// PURPOSE: Accessible tabs (roving tabindex, arrow-key navigation).
// WHY: Settings and detail pages group content in tabs; keyboard users need arrow-key support.
// DEPENDS ON: utils/cn.ts.

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem {
  id: string;
  label: string;
  content?: ReactNode;
}

export function Tabs({
  tabs,
  value,
  onChange,
  label,
  testId = 'tabs',
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  /** Locator prefix: "exams" gives exams-tab-<id> buttons and exams-tab-panel. */
  testId?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (e: KeyboardEvent, index: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const to =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? tabs.length - 1
          : (index + dir + tabs.length) % tabs.length;
    const target = tabs[to];
    if (target) {
      onChange(target.id);
      refs.current[to]?.focus();
    }
  };
  const active = tabs.find((t) => t.id === value);
  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex max-w-full flex-wrap gap-1.5 self-start rounded-full bg-surface p-[5px]"
      >
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${t.id}`}
            type="button"
            aria-selected={t.id === value}
            data-testid={`${testId}-tab-${t.id}`}
            data-selected={t.id === value}
            aria-controls={`panel-${t.id}`}
            tabIndex={t.id === value ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => move(e, i)}
            className={cn(
              'min-h-[38px] whitespace-nowrap rounded-full px-4 py-2 font-bold',
              t.id === value ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active?.content !== undefined && (
        <div
          role="tabpanel"
          id={`panel-${active.id}`}
          aria-labelledby={`tab-${active.id}`}
          data-testid={`${testId}-tab-panel`}
          data-tab={active.id}
          className="pt-4"
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
