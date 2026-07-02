import type { Ticket } from '@ticketdash/shared';
import { Link } from 'react-router-dom';
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

/** Table on desktop, cards on mobile — same data, responsive main flow. */
export function TicketTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface shadow-xs md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-ink-secondary">
              <th scope="col" className="px-4 py-3">Ticket</th>
              <th scope="col" className="px-4 py-3">Priority</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-line/60 last:border-b-0 hover:bg-page/60">
                <td className="max-w-md px-4 py-3">
                  <Link
                    to={`/tickets/${ticket.id}`}
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
          <li key={ticket.id} className="rounded-xl border border-line bg-surface p-4 shadow-xs">
            <Link
              to={`/tickets/${ticket.id}`}
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
