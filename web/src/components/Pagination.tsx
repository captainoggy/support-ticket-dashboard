import type { PaginationMeta } from '@ticketdash/shared';

export function Pagination({
  meta,
  onPage,
}: {
  meta: PaginationMeta;
  onPage: (page: number) => void;
}) {
  if (meta.total === 0) return null;

  const buttonClass =
    'rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium shadow-xs hover:border-ink-muted disabled:opacity-50 disabled:hover:border-line';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <p className="text-sm text-ink-secondary">
        Page {meta.page} of {meta.totalPages} · {meta.total} ticket{meta.total === 1 ? '' : 's'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
