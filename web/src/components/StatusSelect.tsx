import type { TicketStatus } from '@ticketdash/shared';
import { STATUS_LABELS, TICKET_STATUSES } from '@ticketdash/shared';
import { ApiError } from '../api/client';
import { useUpdateTicket } from '../api/hooks';
import { useToast } from './Toast';

/**
 * The core status-change control (select, per the brief's "clear, accessible
 * interaction"). Optimistic: the UI flips instantly and rolls back on failure.
 */
export function StatusSelect({
  ticketId,
  status,
  ticketTitle,
}: {
  ticketId: number;
  status: TicketStatus;
  ticketTitle: string;
}) {
  const updateTicket = useUpdateTicket();
  const toast = useToast();

  return (
    <select
      aria-label={`Status for "${ticketTitle}"`}
      value={status}
      disabled={updateTicket.isPending}
      onChange={(event) => {
        const next = event.target.value as TicketStatus;
        updateTicket.mutate(
          { id: ticketId, input: { status: next } },
          {
            onSuccess: (ticket) =>
              toast.push('success', `Status updated to ${STATUS_LABELS[ticket.status]}`),
            onError: (error) =>
              toast.push(
                'error',
                error instanceof ApiError ? error.message : 'Could not update status',
              ),
          },
        );
      }}
      className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm shadow-xs hover:border-ink-muted disabled:opacity-60"
    >
      {TICKET_STATUSES.map((value) => (
        <option key={value} value={value}>
          {STATUS_LABELS[value]}
        </option>
      ))}
    </select>
  );
}
