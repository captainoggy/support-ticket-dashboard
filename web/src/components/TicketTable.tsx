import type { Ticket, TicketSortField } from '@ticketdash/shared';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { formatAbsolute, formatRelative } from '../lib/format';
import { PriorityBadge, StatusBadge } from './Badges';
import { StatusSelect } from './StatusSelect';

function CreatedAt({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatAbsolute(iso)} className="text-sm text-ink-secondary">
      {formatRelative(iso)}
    </time>
  );
}

const HEADERS: Array<{ label: string; field: TicketSortField }> = [
  { label: 'Ticket', field: 'title' },
  { label: 'Priority', field: 'priority' },
  { label: 'Status', field: 'status' },
  { label: 'Created', field: 'createdAt' },
];

function SortArrow({ direction, active }: { direction: 'asc' | 'desc'; active: boolean }) {
  return (
    <svg
      viewBox="0 0 8 5"
      aria-hidden
      className={`size-2 ${direction === 'asc' ? '' : 'rotate-180'} ${
        active ? 'text-accent' : 'text-ink-muted'
      }`}
      fill="currentColor"
    >
      <path d="M4 0 8 5H0z" />
    </svg>
  );
}

function SortableHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: TicketSortField;
  sort: string;
  onSort: (sort: string) => void;
}) {
  const [sortBy, sortDir] = sort.split(':');
  const active = sortBy === field;
  const nextDir = active && sortDir === 'asc' ? 'desc' : 'asc';
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      className="px-4 py-3"
    >
      <button
        type="button"
        onClick={() => onSort(`${field}:${nextDir}`)}
        title={`Sort by ${label.toLowerCase()} (${nextDir === 'asc' ? 'ascending' : 'descending'})`}
        className="group flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-secondary hover:text-ink"
      >
        {label}
        <span className="flex flex-col gap-px">
          <SortArrow direction="asc" active={active && sortDir === 'asc'} />
          <SortArrow direction="desc" active={active && sortDir === 'desc'} />
        </span>
      </button>
    </th>
  );
}

/** Clicks on links, buttons and selects inside a row must not open the ticket. */
function isInteractive(target: EventTarget): boolean {
  return target instanceof Element && Boolean(target.closest('a, button, select, input, label'));
}

/** Table on desktop, cards on mobile — same data, responsive main flow. */
export function TicketTable({
  tickets,
  sort,
  onSort,
}: {
  tickets: Ticket[];
  sort: string;
  onSort: (sort: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // Carries the current URL (filters, page, sort) so "back" restores this view.
  const from = location.pathname + location.search;
  const openTicket = (event: React.MouseEvent, id: number) => {
    if (isInteractive(event.target)) return;
    navigate(`/tickets/${id}`, { state: { from } });
  };

  return (
    <>
      {/* Desktop */}
      {/* overflow-clip (not -hidden) keeps the rounded corners without creating
          a scroll container, so the sticky header can track the viewport. */}
      <div className="hidden overflow-clip rounded-xl border border-line bg-surface shadow-xs md:block">
        <table className="w-full text-left">
          {/* border-collapse borders don't move with sticky cells; the inset
              shadow is the header's bottom border. */}
          <thead className="sticky top-0 z-10 bg-surface [box-shadow:inset_0_-1px_0_var(--color-line)]">
            <tr>
              {HEADERS.map((header) => (
                <SortableHeader key={header.field} {...header} sort={sort} onSort={onSort} />
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={(event) => openTicket(event, ticket.id)}
                className="cursor-pointer border-b border-line/60 last:border-b-0 hover:bg-page/60"
              >
                <td className="max-w-md px-4 py-3">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    state={{ from }}
                    className="font-medium text-ink hover:text-accent-strong hover:underline"
                  >
                    <span className="text-ink-muted">#{ticket.id}</span> {ticket.title}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-ink-secondary">{ticket.customerName}</p>
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusSelect ticketId={ticket.id} status={ticket.status} ticketTitle={ticket.title} />
                </td>
                <td className="px-4 py-3">
                  <CreatedAt iso={ticket.createdAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="space-y-3 md:hidden">
        {tickets.map((ticket) => (
          <li
            key={ticket.id}
            onClick={(event) => openTicket(event, ticket.id)}
            className="cursor-pointer rounded-xl border border-line bg-surface p-4 shadow-xs"
          >
            <Link
              to={`/tickets/${ticket.id}`}
              state={{ from }}
              className="font-medium text-ink hover:text-accent-strong hover:underline"
            >
              <span className="text-ink-muted">#{ticket.id}</span> {ticket.title}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-ink-secondary">
              <span className="truncate">{ticket.customerName}</span>
              <CreatedAt iso={ticket.createdAt} />
            </div>
            <div className="mt-3">
              <StatusSelect ticketId={ticket.id} status={ticket.status} ticketTitle={ticket.title} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
