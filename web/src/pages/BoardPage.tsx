import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Ticket, TicketStatus } from '@ticketdash/shared';
import { STATUS_LABELS, TICKET_STATUSES } from '@ticketdash/shared';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useTickets, useUpdateTicket } from '../api/hooks';
import { PriorityBadge } from '../components/Badges';
import { ErrorState, ListSkeleton } from '../components/States';
import { useToast } from '../components/Toast';
import { formatRelative } from '../lib/format';

const COLUMN_DOTS: Record<TicketStatus, string> = {
  open: 'bg-status-open-dot',
  in_progress: 'bg-status-progress-dot',
  resolved: 'bg-status-resolved-dot',
};

/** The board shows the most recent 100 tickets; the list view paginates everything. */
const BOARD_LIMIT = 100;

function BoardCard({ ticket, overlay = false }: { ticket: Ticket; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { status: ticket.status },
    disabled: overlay,
  });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...listeners, ...attributes })}
      aria-label={`Ticket #${ticket.id}: ${ticket.title}`}
      className={`rounded-lg border border-line bg-surface p-3 shadow-xs ${
        overlay ? 'rotate-2 shadow-lg' : 'cursor-grab touch-none hover:border-ink-muted'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <Link
        to={`/tickets/${ticket.id}`}
        className="text-sm font-medium leading-snug text-ink hover:text-accent-strong hover:underline"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="text-ink-muted">#{ticket.id}</span> {ticket.title}
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        <PriorityBadge priority={ticket.priority} />
        <span className="truncate text-xs text-ink-secondary">{ticket.customerName}</span>
      </div>
      <p className="mt-1.5 text-xs text-ink-secondary">{formatRelative(ticket.createdAt)}</p>
    </div>
  );
}

function Column({ status, tickets }: { status: TicketStatus; tickets: Ticket[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      aria-label={`${STATUS_LABELS[status]} column, ${tickets.length} tickets`}
      className="flex min-w-0 flex-col"
    >
      <h2 className="flex items-center gap-2 px-1 text-sm font-medium text-ink-secondary">
        <span aria-hidden className={`size-2 rounded-full ${COLUMN_DOTS[status]}`} />
        {STATUS_LABELS[status]}
        <span className="ms-auto rounded-full bg-line/70 px-2 py-0.5 text-xs">{tickets.length}</span>
      </h2>
      <div
        ref={setNodeRef}
        className={`mt-2 flex grow flex-col gap-2 rounded-xl border p-2 transition-colors ${
          isOver ? 'border-accent bg-status-progress-bg/40' : 'border-line/70 bg-page'
        }`}
      >
        {tickets.map((ticket) => (
          <BoardCard key={ticket.id} ticket={ticket} />
        ))}
        {tickets.length === 0 && (
          <p className="grid h-24 place-items-center rounded-lg border border-dashed border-line text-sm text-ink-secondary">
            No tickets
          </p>
        )}
      </div>
    </section>
  );
}

export function BoardPage() {
  const query = useTickets({ page: 1, pageSize: BOARD_LIMIT });
  const updateTicket = useUpdateTicket();
  const toast = useToast();
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const sensors = useSensors(
    // distance keeps plain clicks working (links stay clickable)
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  if (query.isPending) return <ListSkeleton rows={6} />;
  if (query.isError) {
    return <ErrorState message="The board could not be loaded." onRetry={() => query.refetch()} />;
  }

  const tickets = query.data.data;
  const byStatus = (status: TicketStatus) => tickets.filter((t) => t.status === status);

  const onDragStart = (event: DragStartEvent) => {
    setActiveTicket(tickets.find((t) => t.id === event.active.id) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTicket(null);
    const { active, over } = event;
    if (!over) return;
    const nextStatus = over.id as TicketStatus;
    const currentStatus = active.data.current?.status as TicketStatus | undefined;
    if (!TICKET_STATUSES.includes(nextStatus) || nextStatus === currentStatus) return;

    updateTicket.mutate(
      { id: Number(active.id), input: { status: nextStatus } },
      {
        onSuccess: (ticket) =>
          toast.push('success', `#${ticket.id} moved to ${STATUS_LABELS[ticket.status]}`),
        onError: (error) =>
          toast.push('error', error instanceof ApiError ? error.message : 'Could not move ticket'),
      },
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Board</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Drag tickets between columns to update their status
          {query.data.meta.total > BOARD_LIMIT && ` (showing the ${BOARD_LIMIT} most recent)`}.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => `Picked up ticket ${active.id}.`,
            onDragOver: ({ over }) =>
              over ? `Ticket is over the ${STATUS_LABELS[over.id as TicketStatus] ?? over.id} column.` : undefined,
            onDragEnd: ({ over }) =>
              over
                ? `Ticket dropped on ${STATUS_LABELS[over.id as TicketStatus] ?? over.id}.`
                : 'Ticket dropped.',
            onDragCancel: () => 'Dragging cancelled.',
          },
          screenReaderInstructions: {
            draggable:
              'To pick up a ticket, press space or enter. Use the arrow keys to move it to another column, then press space or enter again to drop it.',
          },
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {TICKET_STATUSES.map((status) => (
            <Column key={status} status={status} tickets={byStatus(status)} />
          ))}
        </div>
        <DragOverlay>{activeTicket && <BoardCard ticket={activeTicket} overlay />}</DragOverlay>
      </DndContext>
    </div>
  );
}
