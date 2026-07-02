import type { TicketStatus } from '@ticketdash/shared';
import { STATUS_LABELS, TICKET_STATUSES } from '@ticketdash/shared';
import { TicketEnumSelect } from './TicketEnumSelect';

/** The core status-change control (select, per the brief's "clear, accessible interaction"). */
export function StatusSelect({
  ticketId,
  status,
  ticketTitle,
}: {
  ticketId: number;
  status: TicketStatus;
  ticketTitle: string;
}) {
  return (
    <TicketEnumSelect
      ticketId={ticketId}
      value={status}
      values={TICKET_STATUSES}
      labels={STATUS_LABELS}
      field="status"
      ariaLabel={`Status for "${ticketTitle}"`}
    />
  );
}
