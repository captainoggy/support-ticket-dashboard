import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTickets } from '../api/hooks';
import { FilterBar } from '../components/FilterBar';
import { Pagination } from '../components/Pagination';
import { StatRow } from '../components/StatRow';
import { EmptyState, ErrorState, ListSkeleton } from '../components/States';
import { TicketTable } from '../components/TicketTable';

const PAGE_SIZE = 10;

/**
 * Filter/search/sort/page state lives in the URL: refresh-proof, back-button
 * friendly, and a filtered view can be shared as a link.
 */
export function TicketListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const q = searchParams.get('q') ?? '';
  const sort = searchParams.get('sort') ?? 'createdAt:desc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [sortBy, sortDir] = sort.split(':');

  const applyParams = useCallback(
    (updates: Record<string, string | null>, { resetPage = true } = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const query = useTickets({
    status: status || undefined,
    priority: priority || undefined,
    q: q || undefined,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });

  const hasFilters = Boolean(status || priority || q);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tickets</h1>
      </div>

      <StatRow
        activeStatus={status}
        activePriority={priority}
        onFilter={(nextStatus, nextPriority) =>
          applyParams({ status: nextStatus, priority: nextPriority })
        }
      />

      <FilterBar status={status} priority={priority} q={q} sort={sort} onChange={applyParams} />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ErrorState
          message="The ticket list could not be loaded. Check that the API is running."
          onRetry={() => query.refetch()}
        />
      ) : query.data.data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No tickets match your filters"
            hint="Try adjusting or clearing the filters above."
            action={
              <button
                type="button"
                onClick={() => applyParams({ status: null, priority: null, q: null })}
                className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium shadow-xs hover:border-ink-muted"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            title="No tickets yet"
            hint="Create the first support ticket to get started."
            action={
              <Link
                to="/tickets/new"
                className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
              >
                New ticket
              </Link>
            }
          />
        )
      ) : (
        <div
          aria-busy={query.isFetching}
          className={query.isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'}
        >
          <TicketTable tickets={query.data.data} />
          <div className="mt-4">
            <Pagination meta={query.data.meta} onPage={(next) => applyParams({ page: String(next) }, { resetPage: false })} />
          </div>
        </div>
      )}
    </div>
  );
}
