import { useEffect, useState } from 'react';
import { PRIORITY_LABELS, STATUS_LABELS, TICKET_PRIORITIES, TICKET_STATUSES } from '@ticketdash/shared';

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'priority:desc', label: 'Priority: high → low' },
  { value: 'priority:asc', label: 'Priority: low → high' },
  { value: 'status:asc', label: 'Status: open → resolved' },
  { value: 'status:desc', label: 'Status: resolved → open' },
  { value: 'title:asc', label: 'Title A → Z' },
  { value: 'title:desc', label: 'Title Z → A' },
] as const;

const selectClass =
  'rounded-lg border border-line bg-surface px-2.5 py-2 text-sm shadow-xs hover:border-ink-muted';

export function FilterBar({
  status,
  priority,
  q,
  sort,
  onChange,
}: {
  status: string;
  priority: string;
  q: string;
  sort: string;
  onChange: (updates: Record<string, string | null>) => void;
}) {
  // Local echo of the search box, debounced into the URL.
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const handle = setTimeout(() => onChange({ q: search || null }), 300);
    return () => clearTimeout(handle);
  }, [search, q, onChange]);

  const hasFilters = Boolean(status || priority || q);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 grow sm:grow-0 sm:basis-64">
        <label htmlFor="filter-q" className="mb-1 block text-xs font-medium text-ink-secondary">
          Search
        </label>
        <input
          id="filter-q"
          type="search"
          placeholder="Title, customer or email…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-xs placeholder:text-ink-muted hover:border-ink-muted"
        />
      </div>

      <div>
        <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-ink-secondary">
          Status
        </label>
        <select
          id="filter-status"
          value={status}
          onChange={(event) => onChange({ status: event.target.value || null })}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-priority" className="mb-1 block text-xs font-medium text-ink-secondary">
          Priority
        </label>
        <select
          id="filter-priority"
          value={priority}
          onChange={(event) => onChange({ priority: event.target.value || null })}
          className={selectClass}
        >
          <option value="">All priorities</option>
          {TICKET_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-sort" className="mb-1 block text-xs font-medium text-ink-secondary">
          Sort by
        </label>
        <select
          id="filter-sort"
          value={sort}
          onChange={(event) => onChange({ sort: event.target.value })}
          className={selectClass}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange({ status: null, priority: null, q: null })}
          className="rounded-lg px-3 py-2 text-sm font-medium text-accent hover:text-accent-strong"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
