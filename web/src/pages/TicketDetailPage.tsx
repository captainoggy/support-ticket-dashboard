import { useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useDeleteTicket, useTicket } from '../api/hooks';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { PrioritySelect } from '../components/PrioritySelect';
import { ErrorState } from '../components/States';
import { StatusSelect } from '../components/StatusSelect';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { formatAbsolute, formatRelative } from '../lib/format';

export function TicketDetailPage() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const query = useTicket(id);
  const deleteTicket = useDeleteTicket();
  const dialogRef = useRef<HTMLDialogElement>(null);

  if (!Number.isInteger(id) || id < 1) {
    return <ErrorState message="That ticket id is not valid." />;
  }

  if (query.isPending) {
    return (
      <div role="status" aria-label="Loading ticket" className="mx-auto max-w-3xl space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-line/60" />
        <div className="h-40 animate-pulse rounded-xl bg-line/60" />
        <div className="h-24 animate-pulse rounded-xl bg-line/60" />
      </div>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="mx-auto max-w-3xl">
        {notFound ? (
          <div className="rounded-xl border border-line bg-surface px-6 py-14 text-center shadow-xs">
            <p className="text-base font-medium">Ticket #{id} doesn’t exist</p>
            <p className="mt-1 text-sm text-ink-secondary">It may have been deleted.</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
            >
              Back to tickets
            </Link>
          </div>
        ) : (
          <ErrorState message="The ticket could not be loaded." onRetry={() => query.refetch()} />
        )}
      </div>
    );
  }

  const ticket = query.data;

  const confirmDelete = () => {
    deleteTicket.mutate(ticket.id, {
      onSuccess: () => {
        toast.push('success', `Ticket #${ticket.id} deleted`);
        navigate('/');
      },
      onError: (error) =>
        toast.push('error', error instanceof ApiError ? error.message : 'Could not delete ticket'),
      onSettled: () => dialogRef.current?.close(),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link to="/" className="text-sm text-ink-secondary hover:text-ink">
          ← Back to tickets
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-semibold">
            <span className="text-ink-muted">#{ticket.id}</span> {ticket.title}
          </h1>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          Created {formatRelative(ticket.createdAt)} ({formatAbsolute(ticket.createdAt)})
          {ticket.updatedAt !== ticket.createdAt && (
            <> · Updated {formatRelative(ticket.updatedAt)}</>
          )}
        </p>
      </div>

      <section aria-label="Description" className="rounded-xl border border-line bg-surface p-5 shadow-xs">
        <h2 className="text-sm font-medium text-ink-secondary">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{ticket.description}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-label="Customer" className="rounded-xl border border-line bg-surface p-5 shadow-xs">
          <h2 className="text-sm font-medium text-ink-secondary">Customer</h2>
          <p className="mt-2 font-medium">{ticket.customerName}</p>
          <a
            href={`mailto:${ticket.customerEmail}`}
            className="mt-0.5 block break-all text-sm text-accent hover:text-accent-strong hover:underline"
          >
            {ticket.customerEmail}
          </a>
        </section>

        <section aria-label="Actions" className="rounded-xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex flex-wrap gap-5">
            <div>
              <h2 className="text-sm font-medium text-ink-secondary">Status</h2>
              <div className="mt-2">
                <StatusSelect ticketId={ticket.id} status={ticket.status} ticketTitle={ticket.title} />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-ink-secondary">Priority</h2>
              <div className="mt-2">
                <PrioritySelect ticketId={ticket.id} priority={ticket.priority} ticketTitle={ticket.title} />
              </div>
            </div>
          </div>
          {user?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              className="mt-4 rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger-strong hover:bg-priority-high-bg"
            >
              Delete ticket
            </button>
          )}
        </section>
      </div>

      {/* Native <dialog>: focus trap + Esc for free */}
      <dialog
        ref={dialogRef}
        className="m-auto w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-5 shadow-xl backdrop:bg-ink/40"
      >
        <h2 className="font-semibold">Delete ticket #{ticket.id}?</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          “{ticket.title}” will be permanently removed. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleteTicket.isPending}
            className="rounded-lg bg-danger-strong px-4 py-2 text-sm font-medium text-white hover:bg-danger disabled:opacity-60"
          >
            {deleteTicket.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
