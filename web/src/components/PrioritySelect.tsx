import type { TicketPriority } from '@ticketdash/shared';
import { PRIORITY_LABELS, TICKET_PRIORITIES } from '@ticketdash/shared';
import { TicketEnumSelect } from './TicketEnumSelect';

/** Re-triage a ticket's priority; same optimistic behavior as StatusSelect. */
export function PrioritySelect({
  ticketId,
  priority,
  ticketTitle,
}: {
  ticketId: number;
  priority: TicketPriority;
  ticketTitle: string;
}) {
  return (
    <TicketEnumSelect
      ticketId={ticketId}
      value={priority}
      values={TICKET_PRIORITIES}
      labels={PRIORITY_LABELS}
      field="priority"
      ariaLabel={`Priority for "${ticketTitle}"`}
    />
  );
}
