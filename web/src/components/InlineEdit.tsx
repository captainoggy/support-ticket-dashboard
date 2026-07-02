import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CreateTicketSchema } from '@ticketdash/shared';
import { ApiError } from '../api/client';
import { useUpdateTicket } from '../api/hooks';
import { useToast } from './Toast';

/**
 * Jira-style in-place editing. Single-line fields save on Enter/blur and
 * cancel on Escape; the multiline description uses explicit Save/Cancel
 * (never save a paragraph on blur). Every save reuses the optimistic PATCH
 * hook, so edits appear instantly and roll back with a toast on failure.
 */

type EditableField = 'title' | 'customerName' | 'customerEmail' | 'description';

/** Validates with the shared zod schema and saves; returns an error message when invalid. */
function useSaveField(ticketId: number, field: EditableField, label: string) {
  const updateTicket = useUpdateTicket();
  const toast = useToast();
  return (raw: string): string | null => {
    const parsed = CreateTicketSchema.shape[field].safeParse(raw);
    if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Invalid value';
    updateTicket.mutate(
      { id: ticketId, input: { [field]: parsed.data } },
      {
        onSuccess: () => toast.push('success', `${label} updated`),
        onError: (error) =>
          toast.push(
            'error',
            error instanceof ApiError ? error.message : `Could not update ${label.toLowerCase()}`,
          ),
      },
    );
    return null;
  };
}

function PencilIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className={`size-3.5 shrink-0 ${className}`}
    >
      <path d="M11.1 2.4a1.4 1.4 0 0 1 2 2L5.4 12.1l-2.8.8.8-2.8 7.7-7.7Z" strokeLinejoin="round" />
    </svg>
  );
}

export function InlineText({
  ticketId,
  field,
  value,
  label,
  trigger = 'text',
  display,
  buttonClassName = '',
  inputClassName = '',
}: {
  ticketId: number;
  field: Exclude<EditableField, 'description'>;
  value: string;
  label: string;
  /** 'text': the value itself is the click target. 'icon': only a pencil button
      edits — use when the display is itself interactive (e.g. a mailto link). */
  trigger?: 'text' | 'icon';
  display?: ReactNode;
  buttonClassName?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const save = useSaveField(ticketId, field, label);

  const start = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };
  const close = (restoreFocus: boolean) => {
    setEditing(false);
    setError(null);
    // Only keyboard paths restore focus — a blur means the user clicked elsewhere.
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const commit = (restoreFocus: boolean) => {
    if (draft.trim() === value) {
      close(restoreFocus);
      return;
    }
    const problem = save(draft);
    if (problem) setError(problem);
    else close(restoreFocus);
  };

  if (editing) {
    return (
      <span className="block min-w-0 grow">
        <input
          autoFocus
          aria-label={label}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit(true);
            if (event.key === 'Escape') close(true);
          }}
          onBlur={() => commit(false)}
          className={`w-full rounded-lg border border-line bg-surface px-2 py-1 shadow-xs ${inputClassName}`}
        />
        {error && (
          <span role="alert" className="mt-1 block text-sm font-normal text-danger-strong">
            {error}
          </span>
        )}
      </span>
    );
  }

  if (trigger === 'icon') {
    return (
      <span className={`flex min-w-0 items-center gap-1.5 ${buttonClassName}`}>
        <span className="min-w-0">{display ?? value}</span>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Edit ${label.toLowerCase()}`}
          onClick={start}
          className="rounded p-0.5 text-ink-muted hover:bg-line/40 hover:text-ink"
        >
          <PencilIcon />
        </button>
      </span>
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Edit ${label.toLowerCase()}`}
      onClick={start}
      className={`group -mx-1 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 text-left hover:bg-line/40 ${buttonClassName}`}
    >
      <span className="min-w-0">{display ?? value}</span>
      <PencilIcon className="text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}

export function InlineTextarea({
  ticketId,
  value,
  label,
}: {
  ticketId: number;
  value: string;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const save = useSaveField(ticketId, 'description', label);

  const start = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };
  const close = () => {
    setEditing(false);
    setError(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const commit = () => {
    if (draft.trim() === value) {
      close();
      return;
    }
    const problem = save(draft);
    if (problem) setError(problem);
    else close();
  };

  if (editing) {
    return (
      <div className="mt-2">
        <textarea
          autoFocus
          aria-label={label}
          rows={6}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) commit();
          }}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[15px] leading-relaxed shadow-xs"
        />
        {error && (
          <p role="alert" className="mt-1 text-sm text-danger-strong">
            {error}
          </p>
        )}
        <div className="mt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={close}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={commit}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white shadow-xs hover:bg-accent-strong"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Edit ${label.toLowerCase()}`}
      onClick={start}
      className="group -mx-1 mt-2 block w-full rounded-lg px-1 text-left hover:bg-line/40"
    >
      <span className="whitespace-pre-wrap text-[15px] leading-relaxed">{value}</span>
      <PencilIcon className="ms-1.5 inline-block align-baseline text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
