import { useTicketStats } from '../api/hooks';

interface StatTile {
  key: string;
  label: string;
  value: number;
  dotClass: string;
  /** Fill used while the tile's filter is active — same tokens as badges/columns. */
  activeClass: string;
  active: boolean;
  onClick: () => void;
}

/**
 * KPI row. Per the stat-tile contract: sentence-case label, semibold value in
 * ink (never in the status color — the dot carries identity). Each tile is a
 * button that applies/clears the matching filter.
 */
export function StatRow({
  activeStatus,
  activePriority,
  onFilter,
}: {
  activeStatus: string;
  activePriority: string;
  onFilter: (status: string | null, priority: string | null) => void;
}) {
  const { data, isPending, isError } = useTicketStats();

  if (isError) return null; // stats are enrichment, never block the list
  if (isPending) {
    return (
      <div role="status" aria-label="Loading stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-xl bg-line/60" />
        ))}
      </div>
    );
  }

  const tiles: StatTile[] = [
    {
      key: 'open',
      label: 'Open',
      value: data.open,
      dotClass: 'bg-status-open-dot',
      activeClass: 'border-status-open-dot/60 bg-status-open-bg text-status-open-text',
      active: activeStatus === 'open' && !activePriority,
      onClick: () => onFilter(activeStatus === 'open' && !activePriority ? null : 'open', null),
    },
    {
      key: 'in_progress',
      label: 'In progress',
      value: data.inProgress,
      dotClass: 'bg-status-progress-dot',
      activeClass: 'border-status-progress-dot/60 bg-status-progress-bg text-status-progress-text',
      active: activeStatus === 'in_progress',
      onClick: () => onFilter(activeStatus === 'in_progress' ? null : 'in_progress', null),
    },
    {
      key: 'resolved',
      label: 'Resolved',
      value: data.resolved,
      dotClass: 'bg-status-resolved-dot',
      activeClass: 'border-status-resolved-dot/60 bg-status-resolved-bg text-status-resolved-text',
      active: activeStatus === 'resolved',
      onClick: () => onFilter(activeStatus === 'resolved' ? null : 'resolved', null),
    },
    {
      key: 'high_open',
      label: 'High priority open',
      value: data.highPriorityOpen,
      dotClass: 'bg-priority-high-dot',
      activeClass: 'border-priority-high-dot/60 bg-priority-high-bg text-priority-high-text',
      active: activeStatus === 'open' && activePriority === 'high',
      onClick: () =>
        activeStatus === 'open' && activePriority === 'high'
          ? onFilter(null, null)
          : onFilter('open', 'high'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <button
          key={tile.key}
          type="button"
          onClick={tile.onClick}
          aria-pressed={tile.active}
          className={`rounded-xl border px-4 py-3 text-left shadow-xs transition-colors ${
            tile.active ? tile.activeClass : 'border-line bg-surface hover:border-ink-muted'
          }`}
        >
          <span
            className={`flex items-center gap-1.5 text-sm ${
              tile.active ? 'text-inherit' : 'text-ink-secondary'
            }`}
          >
            <span aria-hidden className={`size-2 rounded-full ${tile.dotClass}`} />
            {tile.label}
          </span>
          <span className="mt-1 block text-2xl font-semibold">{tile.value}</span>
        </button>
      ))}
    </div>
  );
}
