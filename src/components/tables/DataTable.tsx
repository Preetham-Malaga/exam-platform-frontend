// PURPOSE: Accessible data table with sortable headers, loading/error/empty states, and Pagination.
// WHY: Every list page (students, questions, exams, results, audit logs) needs the same server-side paginated table.
// DEPENDS ON: feedback/States.tsx, ui/Button.tsx, Icon.tsx.

import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/States';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}
export interface SortState {
  key: string;
  order: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: SortState | undefined;
  onSortChange?: (s: SortState) => void;
  loading?: boolean;
  error?: string | undefined;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
}: DataTableProps<T>) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} {...(onRetry ? { onRetry } : {})} />;
  if (!rows.length)
    return (
      <EmptyState
        title={emptyTitle}
        {...(emptyDescription ? { description: emptyDescription } : {})}
        {...(emptyAction ? { action: emptyAction } : {})}
      />
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    active
                      ? sort!.order === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : c.sortable
                        ? 'none'
                        : undefined
                  }
                  className={cn('whitespace-nowrap px-4 py-3 font-semibold', c.className)}
                >
                  {c.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 uppercase hover:text-text"
                      onClick={() =>
                        onSortChange({
                          key: c.key,
                          order: active && sort!.order === 'asc' ? 'desc' : 'asc',
                        })
                      }
                    >
                      {c.header}
                      {active && (
                        <Icon name={sort!.order === 'asc' ? 'arrowUp' : 'arrowDown'} size={12} />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-border last:border-0 hover:bg-background/60"
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted"
    >
      <p aria-live="polite">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" size={16} />
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <Icon name="chevronRight" size={16} />
        </Button>
      </div>
    </nav>
  );
}
