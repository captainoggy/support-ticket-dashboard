import type { TicketPriority, TicketStatus } from '@ticketdash/shared';
import { PRIORITY_LABELS, STATUS_LABELS } from '@ticketdash/shared';

/** Identity is never color-alone: every badge carries its text label and a dot. */

const STATUS_STYLES: Record<TicketStatus, { chip: string; dot: string }> = {
  open: { chip: 'bg-status-open-bg text-status-open-text', dot: 'bg-status-open-dot' },
  in_progress: {
    chip: 'bg-status-progress-bg text-status-progress-text',
    dot: 'bg-status-progress-dot',
  },
  resolved: {
    chip: 'bg-status-resolved-bg text-status-resolved-text',
    dot: 'bg-status-resolved-dot',
  },
};

const PRIORITY_STYLES: Record<TicketPriority, { chip: string; dot: string }> = {
  low: { chip: 'bg-priority-low-bg text-priority-low-text', dot: 'bg-priority-low-dot' },
  medium: {
    chip: 'bg-priority-medium-bg text-priority-medium-text',
    dot: 'bg-priority-medium-dot',
  },
  high: { chip: 'bg-priority-high-bg text-priority-high-text', dot: 'bg-priority-high-dot' },
};

function Chip({ label, chip, dot }: { label: string; chip: string; dot: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${chip}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Chip label={STATUS_LABELS[status]} {...STATUS_STYLES[status]} />;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Chip label={PRIORITY_LABELS[priority]} {...PRIORITY_STYLES[priority]} />;
}
