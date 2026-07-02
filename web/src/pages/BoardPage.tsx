import { useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Ticket, TicketStatus } from '@ticketdash/shared';
import { STATUS_LABELS, TICKET_STATUSES } from '@ticketdash/shared';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useTickets, useUpdateTicket } from '../api/hooks';
import { PriorityBadge } from '../components/Badges';
import { BoardSkeleton, ErrorState } from '../components/States';
import { useToast } from '../components/Toast';
import { formatRelative } from '../lib/format';

const COLUMN_DOTS: Record<TicketStatus, string> = {
  open: 'bg-status-open-dot',
  in_progress: 'bg-status-progress-dot',
  resolved: 'bg-status-resolved-dot',
};

/** The board shows the top 100 tickets by rank; the list view paginates everything. */
const BOARD_LIMIT = 100;

type ColumnMap = Record<TicketStatus, number[]>;

function deriveColumns(tickets: Ticket[]): ColumnMap {
  const columns: ColumnMap = { open: [], in_progress: [], resolved: [] };
  for (const ticket of [...tickets].sort((a, b) => a.position - b.position)) {
    columns[ticket.status].push(ticket.id);
  }
  return columns;
}

function columnOf(columns: ColumnMap, ticketId: number): TicketStatus | null {
  return TICKET_STATUSES.find((status) => columns[status].includes(ticketId)) ?? null;
}

function BoardCard({ ticket, overlay = false }: { ticket: Ticket; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
    disabled: overlay,
  });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...listeners, ...attributes })}
      style={overlay ? undefined : { transform: CSS.Transform.toString(transform), transition }}
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

function Column({
  status,
  tickets,
  isDropTarget,
}: {
  status: TicketStatus;
  tickets: Ticket[];
  /** True while the dragged card is previewed in this column. */
  isDropTarget: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const highlighted = isOver || isDropTarget;
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
          highlighted ? 'border-accent bg-status-progress-bg/40' : 'border-line/70 bg-page'
        }`}
      >
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <BoardCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>
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
  const query = useTickets({ page: 1, pageSize: BOARD_LIMIT, sortBy: 'position', sortDir: 'asc' });
  const updateTicket = useUpdateTicket();
  const toast = useToast();
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  // During a drag this overrides the server-derived columns, so a card dragged
  // over another column opens a real gap where it will land.
  const [dragColumns, setDragColumns] = useState<ColumnMap | null>(null);
  const crossedColumns = useRef(false);

  const sensors = useSensors(
    // distance keeps plain clicks working (links stay clickable)
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (query.isPending) return <BoardSkeleton />;
  if (query.isError) {
    return <ErrorState message="The board could not be loaded." onRetry={() => query.refetch()} />;
  }

  const tickets = query.data.data;
  const ticketById = new Map(tickets.map((t) => [t.id, t]));
  const columns = dragColumns ?? deriveColumns(tickets);
  // The column the dragged card is currently previewed in gets the drop glow.
  const activeColumn = activeTicket ? columnOf(columns, activeTicket.id) : null;

  const resetDrag = () => {
    setActiveTicket(null);
    setDragColumns(null);
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveTicket(ticketById.get(Number(event.active.id)) ?? null);
    setDragColumns(deriveColumns(tickets));
    crossedColumns.current = false;
  };

  /** Reparent the dragged card into the hovered column (preview only). */
  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = Number(active.id);
    setDragColumns((current) => {
      if (!current) return current;
      const from = columnOf(current, activeId);
      const to = TICKET_STATUSES.includes(over.id as TicketStatus)
        ? (over.id as TicketStatus)
        : columnOf(current, Number(over.id));
      if (!from || !to || from === to) return current;
      crossedColumns.current = true;
      const fromIds = current[from].filter((id) => id !== activeId);
      const toIds = [...current[to]];
      const overIndex = toIds.indexOf(Number(over.id));
      toIds.splice(overIndex === -1 ? toIds.length : overIndex, 0, activeId);
      return { ...current, [from]: fromIds, [to]: toIds };
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const cols = dragColumns;
    resetDrag();
    if (!over || !cols) return;
    const activeId = Number(active.id);
    const ticket = ticketById.get(activeId);
    if (!ticket) return;
    // A drop on itself is only a no-op if the card never left its column.
    if (active.id === over.id && !crossedColumns.current) return;

    const targetStatus = TICKET_STATUSES.includes(over.id as TicketStatus)
      ? (over.id as TicketStatus)
      : (columnOf(cols, Number(over.id)) ?? ticket.status);

    // Final order of the target column, with the card in its dropped slot.
    const ids = [...cols[targetStatus]];
    let finalIds: number[];
    const activeIndex = ids.indexOf(activeId);
    const overIndex = ids.indexOf(Number(over.id));
    if (overIndex === -1) {
      // Dropped on the column itself (its empty space): send to the end.
      finalIds = activeIndex === -1 ? [...ids, activeId] : arrayMove(ids, activeIndex, ids.length - 1);
    } else if (activeIndex === -1) {
      ids.splice(overIndex, 0, activeId);
      finalIds = ids;
    } else {
      finalIds = arrayMove(ids, activeIndex, overIndex);
    }

    // One-write rank: midpoint of the new neighbours (or just past the edge).
    const index = finalIds.indexOf(activeId);
    const before = ticketById.get(finalIds[index - 1]);
    const after = ticketById.get(finalIds[index + 1]);
    const position =
      before && after
        ? (before.position + after.position) / 2
        : before
          ? before.position + 1
          : after
            ? after.position - 1
            : 0;

    const sameColumn = targetStatus === ticket.status;
    if (sameColumn && position === ticket.position) return;

    updateTicket.mutate(
      { id: ticket.id, input: sameColumn ? { position } : { status: targetStatus, position } },
      {
        onSuccess: (updated) =>
          toast.push(
            'success',
            sameColumn
              ? `#${updated.id} reordered in ${STATUS_LABELS[updated.status]}`
              : `#${updated.id} moved to ${STATUS_LABELS[updated.status]}`,
          ),
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
          Drag tickets between columns to update their status, or within a column to reorder
          {query.data.meta.total > BOARD_LIMIT && ` (showing the top ${BOARD_LIMIT})`}.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={resetDrag}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => `Picked up ticket ${active.id}.`,
            onDragOver: ({ active, over }) => {
              if (!over) return undefined;
              const columnLabel = STATUS_LABELS[over.id as TicketStatus];
              return columnLabel
                ? `Ticket ${active.id} is over the ${columnLabel} column.`
                : `Ticket ${active.id} is over ticket ${over.id}.`;
            },
            onDragEnd: ({ active, over }) => {
              if (!over) return `Ticket ${active.id} dropped.`;
              const columnLabel = STATUS_LABELS[over.id as TicketStatus];
              return columnLabel
                ? `Ticket ${active.id} dropped on the ${columnLabel} column.`
                : `Ticket ${active.id} dropped at the place of ticket ${over.id}.`;
            },
            onDragCancel: () => 'Dragging cancelled.',
          },
          screenReaderInstructions: {
            draggable:
              'To pick up a ticket, press space or enter. Use the arrow keys to reorder it within its column or move it to another column, then press space or enter again to drop it.',
          },
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {TICKET_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              isDropTarget={status === activeColumn}
              tickets={columns[status]
                .map((id) => ticketById.get(id))
                .filter((t): t is Ticket => Boolean(t))}
            />
          ))}
        </div>
        <DragOverlay>{activeTicket && <BoardCard ticket={activeTicket} overlay />}</DragOverlay>
      </DndContext>
    </div>
  );
}
