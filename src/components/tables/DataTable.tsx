// PURPOSE: Accessible data table with sortable headers, loading/error/empty states, and Pagination.
// WHY: Every list page (students, questions, exams, results, audit logs) needs the same server-side paginated table.
// DEPENDS ON: feedback/States.tsx, ui/Button.tsx, Icon.tsx.

import { Fragment, type ReactNode } from 'react';
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
  /** Locator prefix (e.g. "exam"): exam-table, exam-row (+ data-entity-id), exam-row-<column>-cell, exam-loader/-empty/-error. */
  testId?: string;
  /** Business code shown on the row (exam code, roll number); exposed as data-entity-code. */
  rowCode?: (row: T) => string | null | undefined;
  /** Content shown in place under a row (inline edit form, delete confirmation); null/undefined = nothing. */
  expandedRow?: (row: T) => ReactNode;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  testId = 'data',
  rowCode,
  expandedRow,
  sort,
  onSortChange,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
}: DataTableProps<T>) {
  if (loading) return <LoadingState testId={`${testId}-loader`} />;
  if (error)
    return (
      <ErrorState testId={`${testId}-error`} message={error} {...(onRetry ? { onRetry } : {})} />
    );
  if (!rows.length)
    return (
      <EmptyState
        testId={`${testId}-empty`}
        title={emptyTitle}
        {...(emptyDescription ? { description: emptyDescription } : {})}
        {...(emptyAction ? { action: emptyAction } : {})}
      />
    );
  return (
    <div className="overflow-x-auto px-3">
      <table
        className="w-full min-w-[640px] border-separate border-spacing-x-0 border-spacing-y-1.5"
        data-testid={`${testId}-table`}
      >
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-xs font-bold text-muted">
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
                  className={cn('whitespace-nowrap px-3 py-1.5 font-bold', c.className)}
                >
                  {c.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-bold hover:text-ink"
                      data-testid={`${testId}-sort-${c.key}-btn`}
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
          {rows.map((row) => {
            const below = expandedRow?.(row) ?? null;
            const expanded = below !== null && below !== false;
            return (
              <Fragment key={rowKey(row)}>
                <tr
                  className="[&>td:first-child]:rounded-l-[14px] [&>td:last-child]:rounded-r-[14px]"
                  data-testid={`${testId}-row`}
                  data-entity-id={rowKey(row)}
                  data-entity-code={rowCode?.(row) ?? undefined}
                  data-expanded={expanded ? 'true' : undefined}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn('bg-row px-3 py-[11px] align-middle', c.className)}
                      data-testid={`${testId}-row-${c.key}-cell`}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
                {expanded && (
                  <tr
                    className="[&>td]:rounded-[14px]"
                    data-testid={`${testId}-row-expanded`}
                    data-entity-id={rowKey(row)}
                  >
                    <td colSpan={columns.length} className="bg-row p-3">
                      {below}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
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
  testId = 'pagination',
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  testId?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-3 text-sm text-muted"
      data-testid={testId}
      data-page={page}
      data-total-pages={totalPages}
    >
      <p aria-live="polite" data-testid={`${testId}-summary`}>
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          data-testid={`${testId}-prev-btn`}
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
          data-testid={`${testId}-next-btn`}
        >
          <Icon name="chevronRight" size={16} />
        </Button>
      </div>
    </nav>
  );
}
