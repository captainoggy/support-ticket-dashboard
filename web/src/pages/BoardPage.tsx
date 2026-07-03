import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MutableRefObject } from 'react';
import type { Ticket, TicketStatus } from '@ticketdash/shared';
import { STATUS_LABELS, TICKET_STATUSES } from '@ticketdash/shared';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useTickets, useUpdateTicket } from '../api/hooks';
import { PriorityBadge } from '../components/Badges';
import { BoardSkeleton, ErrorState } from '../components/States';
import { TOAST_DURATION_MS, useToast } from '../components/Toast';
import { formatRelative } from '../lib/format';

const COLUMN_DOTS: Record<TicketStatus, string> = {
  open: 'bg-status-open-dot',
  in_progress: 'bg-status-progress-dot',
  resolved: 'bg-status-resolved-dot',
};

// Each column carries its status color as a soft header band (same tokens as
// the badges), keeping the body neutral so the cards stay the focus.
const COLUMN_HEADERS: Record<TicketStatus, string> = {
  open: 'bg-status-open-bg text-status-open-text',
  in_progress: 'bg-status-progress-bg text-status-progress-text',
  resolved: 'bg-status-resolved-bg text-status-resolved-text',
};

// One-shot pulse on a just-dropped card, in the destination column's color.
const DROP_GLOW: Record<TicketStatus, string> = {
  open: 'animate-drop-glow [--glow:var(--color-status-open-dot)]',
  in_progress: 'animate-drop-glow [--glow:var(--color-status-progress-dot)]',
  resolved: 'animate-drop-glow [--glow:var(--color-status-resolved-dot)]',
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

function BoardCard({
  ticket,
  overlay = false,
  suppressClick,
  glow = null,
}: {
  ticket: Ticket;
  overlay?: boolean;
  suppressClick?: MutableRefObject<boolean>;
  /** Set right after a drop: pulse in the destination column's color. */
  glow?: TicketStatus | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
    disabled: overlay,
  });
  const navigate = useNavigate();
  const location = useLocation();
  // Lets the detail page send the visitor back here instead of to the list.
  const from = location.pathname + location.search;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...listeners, ...attributes })}
      style={
        overlay
          ? undefined
          : {
              transform: CSS.Transform.toString(transform),
              transition,
              // The glow lives exactly as long as the confirmation toast.
              ...(glow ? { animationDuration: `${TOAST_DURATION_MS}ms` } : {}),
            }
      }
      aria-label={`Ticket #${ticket.id}: ${ticket.title}`}
      onClick={(event) => {
        // The whole card opens the ticket, but not the click the browser
        // fires right after a drag, not clicks the title link handles, and
        // not modified clicks (new tab etc.), which belong to the browser.
        if (overlay || suppressClick?.current) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.target instanceof Element && event.target.closest('a')) return;
        navigate(`/tickets/${ticket.id}`, { state: { from } });
      }}
      className={`select-none rounded-lg border border-line bg-surface p-3 shadow-xs ${
        overlay
          ? 'rotate-2 shadow-lg'
          : 'cursor-pointer touch-manipulation transition-shadow hover:border-ink-muted hover:shadow-md active:cursor-grabbing'
      } ${isDragging ? 'opacity-40' : ''} ${glow ? DROP_GLOW[glow] : ''}`}
    >
      <Link
        to={`/tickets/${ticket.id}`}
        state={{ from }}
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
  suppressClick,
  sectionRef,
  glowTicketId,
}: {
  status: TicketStatus;
  tickets: Ticket[];
  /** True while the dragged card is previewed in this column. */
  isDropTarget: boolean;
  suppressClick: MutableRefObject<boolean>;
  /** Lets the board pan a drop's destination column into view afterwards. */
  sectionRef: (node: HTMLElement | null) => void;
  /** Id of a card that just landed in this column (it gets the color pulse). */
  glowTicketId: number | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const highlighted = isOver || isDropTarget;
  return (
    <section
      ref={sectionRef}
      aria-label={`${STATUS_LABELS[status]} column, ${tickets.length} tickets`}
      className={`flex min-w-0 flex-col overflow-clip rounded-xl border shadow-xs transition-colors ${
        highlighted ? 'border-accent' : 'border-line/70'
      } w-[85vw] shrink-0 snap-start sm:w-80 md:w-auto md:shrink md:snap-align-none`}
    >
      {/* Sticks while scrolling a long column (overflow-clip on the container
          keeps the rounded corners without breaking position: sticky). */}
      <h2
        className={`sticky top-0 z-10 flex items-center gap-2 px-3 py-2.5 text-sm font-semibold ${COLUMN_HEADERS[status]}`}
      >
        <span aria-hidden className={`size-2 rounded-full ${COLUMN_DOTS[status]}`} />
        {STATUS_LABELS[status]}
        <span className="ms-auto rounded-full bg-surface/70 px-2 py-0.5 text-xs font-semibold">
          {tickets.length}
        </span>
      </h2>
      <div
        ref={setNodeRef}
        className={`flex grow flex-col gap-2 p-2 transition-colors ${
          highlighted ? 'bg-status-progress-bg/40' : 'bg-page'
        } max-h-[65dvh] overflow-y-auto [overflow-anchor:none] md:max-h-none md:overflow-visible`}
      >
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <BoardCard
              key={ticket.id}
              ticket={ticket}
              suppressClick={suppressClick}
              glow={ticket.id === glowTicketId ? status : null}
            />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <p className="grid h-24 place-items-center rounded-lg border border-dashed border-line text-sm text-ink-secondary">
            No tickets yet. Drag one here.
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
  // Blocks the synthetic click the browser fires on the card right after a drag.
  const suppressClick = useRef(false);
  // Last known drop target, reused while the pointer briefly leaves every droppable.
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const columnRefs = useRef<Partial<Record<TicketStatus, HTMLElement>>>({});
  // Keeps snap suspended briefly after a cross-column drop. Re-enabling it
  // immediately makes the browser re-snap to the column it last snapped to,
  // the SOURCE column, yanking the view away from where the card landed.
  const [panningToDrop, setPanningToDrop] = useState(false);
  // Just-dropped card: pulses once in its destination column's color.
  const [dropGlow, setDropGlow] = useState<{ id: number; status: TicketStatus } | null>(null);
  const glowTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(glowTimer.current), []);

  const sensors = useSensors(
    // Mouse: 8px of movement starts a drag, so plain clicks still open tickets.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Touch: long-press lifts a card (Jira-style), so swipes pan the board and
    // scroll the columns instead of accidentally dragging.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
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

  // Pointer-first collision detection (dnd-kit's multiple-containers pattern).
  // The column under the pointer is the target, corner-distance heuristics on
  // a column-wide card can skip the middle column entirely on fast drags.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
    let overId = getFirstCollision(hits, 'id');

    if (overId != null) {
      if (TICKET_STATUSES.includes(overId as TicketStatus)) {
        // Over a column's empty space: retarget to its closest card so the
        // insertion index stays precise (the column itself means "append").
        const ids = columns[overId as TicketStatus];
        if (ids.length > 0) {
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (container) => container.id !== overId && ids.includes(Number(container.id)),
            ),
          });
          overId = getFirstCollision(closest, 'id') ?? overId;
        }
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    }
    // Nothing under the pointer (fast drag past an edge): keep the last target
    // so the card doesn't snap home mid-gesture.
    return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
  };

  const resetDrag = () => {
    setActiveTicket(null);
    setDragColumns(null);
    // The post-drag click fires before this timeout runs, so it gets blocked;
    // ordinary clicks (no drag ever started) are unaffected.
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveTicket(ticketById.get(Number(event.active.id)) ?? null);
    setDragColumns(deriveColumns(tickets));
    crossedColumns.current = false;
    suppressClick.current = true;
    lastOverId.current = null;
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

    // Glow the landed card in its new column's color for as long as the
    // confirmation toast is on screen.
    setDropGlow({ id: ticket.id, status: targetStatus });
    window.clearTimeout(glowTimer.current);
    glowTimer.current = window.setTimeout(() => setDropGlow(null), TOAST_DURATION_MS);

    if (!sameColumn) {
      // Keep the viewport on the destination: snap stays suspended while we
      // pan the target column into view, then re-engages onto it.
      setPanningToDrop(true);
      requestAnimationFrame(() => {
        columnRefs.current[targetStatus]?.scrollIntoView({
          behavior: 'smooth',
          inline: 'nearest',
          block: 'nearest',
        });
        window.setTimeout(() => setPanningToDrop(false), 400);
      });
    }

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Board</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Drag tickets between columns to update their status, or within a column to reorder
            {query.data.meta.total > BOARD_LIMIT && ` (showing the top ${BOARD_LIMIT})`}.
          </p>
        </div>
        <Link
          to="/tickets/new"
          className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-xs hover:bg-accent-strong"
        >
          New ticket
        </Link>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        // Re-measure drop targets while dragging: the preview reparents cards
        // between columns, so drag-start geometry goes stale immediately.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        // Engage horizontal auto-pan only near the edge; y keeps the default.
        autoScroll={{ threshold: { x: 0.15, y: 0.2 } }}
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
        {/* Mobile: Jira-style horizontal board, columns stay side by side,
            swipe to pan (snap per column), each column scrolls vertically.
            Snap is suspended DURING a drag: mandatory snap turns every
            auto-scroll nudge into a full-column jump, flinging the board from
            the first column to the last. md+: three-column grid, page scroll. */}
        <div
          className={`flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 ${
            activeTicket || panningToDrop ? '' : 'snap-x snap-mandatory md:snap-none'
          }`}
        >
          {TICKET_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              isDropTarget={status === activeColumn}
              suppressClick={suppressClick}
              sectionRef={(node) => {
                if (node) columnRefs.current[status] = node;
                else delete columnRefs.current[status];
              }}
              glowTicketId={dropGlow?.status === status ? dropGlow.id : null}
              tickets={columns[status]
                .map((id) => ticketById.get(id))
                .filter((t): t is Ticket => Boolean(t))}
            />
          ))}
        </div>
        {/* No drop animation: the live preview already shows the card in its
            final slot, so the default "fly home" animation only travels to
            stale coordinates (worse while the board pans) and reads as the
            card returning to its source column. */}
        <DragOverlay dropAnimation={null}>
          {activeTicket && <BoardCard ticket={activeTicket} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
