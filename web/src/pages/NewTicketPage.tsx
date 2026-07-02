import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { CreateTicketInput } from '@ticketdash/shared';
import { CreateTicketSchema, PRIORITY_LABELS, TICKET_PRIORITIES } from '@ticketdash/shared';
import { ApiError } from '../api/client';
import { useCreateTicket } from '../api/hooks';
import { useToast } from '../components/Toast';

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-xs placeholder:text-ink-muted hover:border-ink-muted aria-invalid:border-danger';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger-strong">
      {message}
    </p>
  );
}

export function NewTicketPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createTicket = useCreateTicket();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketInput>({
    // The same zod schema the API validates with — client and server can't drift.
    resolver: zodResolver(CreateTicketSchema),
    defaultValues: { priority: 'medium' },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      const ticket = await createTicket.mutateAsync(input);
      toast.push('success', `Ticket #${ticket.id} created`);
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        // Surface server-side validation on the exact fields it names.
        for (const detail of error.details) {
          setError(detail.field as keyof CreateTicketInput, { message: detail.message });
        }
      } else {
        toast.push('error', error instanceof ApiError ? error.message : 'Could not create ticket');
      }
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link to="/" className="text-sm text-ink-secondary hover:text-ink">
          ← Back to tickets
        </Link>
        <h1 className="mt-2 text-xl font-semibold">New ticket</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          New tickets always start with the status <strong>Open</strong>.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-xs">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            Title <span aria-hidden className="text-danger">*</span>
          </label>
          <input
            id="title"
            type="text"
            placeholder="Short summary of the problem"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
            {...register('title')}
            className={inputClass}
          />
          <FieldError id="title-error" message={errors.title?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customerName" className="mb-1 block text-sm font-medium">
              Customer name <span aria-hidden className="text-danger">*</span>
            </label>
            <input
              id="customerName"
              type="text"
              placeholder="Jane Smith"
              aria-invalid={Boolean(errors.customerName)}
              aria-describedby={errors.customerName ? 'customerName-error' : undefined}
              {...register('customerName')}
              className={inputClass}
            />
            <FieldError id="customerName-error" message={errors.customerName?.message} />
          </div>
          <div>
            <label htmlFor="customerEmail" className="mb-1 block text-sm font-medium">
              Customer email <span aria-hidden className="text-danger">*</span>
            </label>
            <input
              id="customerEmail"
              type="email"
              placeholder="jane@example.com"
              aria-invalid={Boolean(errors.customerEmail)}
              aria-describedby={errors.customerEmail ? 'customerEmail-error' : undefined}
              {...register('customerEmail')}
              className={inputClass}
            />
            <FieldError id="customerEmail-error" message={errors.customerEmail?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="priority" className="mb-1 block text-sm font-medium">
            Priority <span aria-hidden className="text-danger">*</span>
          </label>
          <select id="priority" {...register('priority')} className={inputClass}>
            {TICKET_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
          <FieldError id="priority-error" message={errors.priority?.message} />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Description <span aria-hidden className="text-danger">*</span>
          </label>
          <textarea
            id="description"
            rows={6}
            placeholder="What happened? What did the customer expect?"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'description-error' : undefined}
            {...register('description')}
            className={inputClass}
          />
          <FieldError id="description-error" message={errors.description?.message} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Link to="/" className="rounded-lg px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-accent-strong disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
