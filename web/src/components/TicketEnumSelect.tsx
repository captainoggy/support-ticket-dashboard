import { ApiError } from '../api/client';
import { useUpdateTicket } from '../api/hooks';
import { useToast } from './Toast';

/**
 * Shared base for the status and priority selects: an accessible select that
 * PATCHes one enum field optimistically (instant UI, rollback + toast on error).
 */
export function TicketEnumSelect<Value extends string>({
  ticketId,
  value,
  values,
  labels,
  field,
  ariaLabel,
}: {
  ticketId: number;
  value: Value;
  values: readonly Value[];
  labels: Record<Value, string>;
  field: 'status' | 'priority';
  ariaLabel: string;
}) {
  const updateTicket = useUpdateTicket();
  const toast = useToast();

  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={updateTicket.isPending}
      onChange={(event) => {
        const next = event.target.value as Value;
        updateTicket.mutate(
          { id: ticketId, input: { [field]: next } },
          {
            onSuccess: (ticket) =>
              toast.push(
                'success',
                `${field === 'status' ? 'Status' : 'Priority'} updated to ${labels[ticket[field] as Value]}`,
              ),
            onError: (error) =>
              toast.push(
                'error',
                error instanceof ApiError ? error.message : `Could not update ${field}`,
              ),
          },
        );
      }}
      className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm shadow-xs hover:border-ink-muted disabled:opacity-60"
    >
      {values.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}
