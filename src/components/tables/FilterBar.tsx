// PURPOSE: Search box (debounced) and the filter bar that lays out search + filter controls above tables.
// WHY: All list pages share the same search/filter row; debouncing avoids a request per keystroke.
// DEPENDS ON: hooks/useDebounce.ts, ui/Icon.tsx, ui/Button.tsx.

import { useEffect, useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useDebounce } from '@/hooks/useDebounce';

export function SearchInput({
  value,
  onSearch,
  placeholder = 'Search…',
  label = 'Search',
  delayMs = 300,
  testId = 'search-input',
}: {
  value: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  label?: string;
  delayMs?: number;
  testId?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, delayMs);
  useEffect(() => {
    if (debounced !== value) onSearch(debounced);
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reset the box when the parent changes the value (e.g. "Clear filters"): adjust state during render, not in an effect.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }
  return (
    <div role="search" className="relative w-full sm:w-72">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <Icon name="search" size={16} />
      </span>
      <input
        id={id}
        type="search"
        name="search"
        data-testid={testId}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        className="h-[46px] w-full rounded-input border-[1.5px] border-border bg-surface-2 pl-9 pr-3 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-focus"
      />
    </div>
  );
}

export function FilterBar({
  children,
  onClear,
  canClear,
}: {
  children: ReactNode;
  onClear?: () => void;
  canClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2.5 px-[22px] pb-2 pt-[22px]">
      {children}
      {onClear && canClear && (
        <Button variant="ghost" size="sm" onClick={onClear} data-testid="filter-clear-btn">
          Clear filters
        </Button>
      )}
    </div>
  );
}
