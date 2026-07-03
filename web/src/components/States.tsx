import type { ReactNode } from 'react';

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading tickets" className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-line/60" />
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading board"
      className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0"
    >
      {Array.from({ length: 3 }, (_, column) => (
        <div
          key={column}
          className="w-[85vw] shrink-0 overflow-hidden rounded-xl border border-line/70 sm:w-80 md:w-auto md:shrink"
        >
          <div className="h-10 animate-pulse bg-line/60" />
          <div className="space-y-2 bg-page p-2">
            {Array.from({ length: 3 - (column % 2) }, (_, card) => (
              <div key={card} className="h-24 animate-pulse rounded-lg bg-line/60" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <p className="text-base font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-secondary">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-priority-high-bg px-6 py-10 text-center">
      <p className="font-medium text-priority-high-text">Something went wrong</p>
      <p className="mt-1 text-sm text-priority-high-text/90">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-danger-strong px-4 py-2 text-sm font-medium text-white hover:bg-danger"
        >
          Try again
        </button>
      )}
    </div>
  );
}
