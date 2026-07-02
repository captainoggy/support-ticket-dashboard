import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateTicketInput,
  Ticket,
  TicketListResponse,
  TicketStats,
  UpdateTicketInput,
} from '@ticketdash/shared';
import { api } from './client';

export interface TicketListParams {
  status?: string;
  priority?: string;
  q?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (params: TicketListParams) => [...ticketKeys.lists(), params] as const,
  detail: (id: number) => [...ticketKeys.all, 'detail', id] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
};

function toQueryString(params: TicketListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useTickets(params: TicketListParams) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => api.get<TicketListResponse>(`/api/tickets${toQueryString(params)}`),
    // Keep showing the previous page while the next one loads — no flash of skeleton.
    placeholderData: keepPreviousData,
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => api.get<Ticket>(`/api/tickets/${id}`),
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: ticketKeys.stats(),
    queryFn: () => api.get<TicketStats>('/api/tickets/stats'),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => api.post<Ticket>('/api/tickets', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}

/**
 * Optimistic update: every cached list and the detail entry flip immediately,
 * roll back on error, and re-sync with the server when settled.
 */
export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTicketInput }) =>
      api.patch<Ticket>(`/api/tickets/${id}`, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ticketKeys.all });
      const previousLists = queryClient.getQueriesData<TicketListResponse>({
        queryKey: ticketKeys.lists(),
      });
      const previousDetail = queryClient.getQueryData<Ticket>(ticketKeys.detail(id));

      // Merge the change into every cached list; when a list is filtered by a
      // field the update just changed, drop the ticket from it instead of
      // showing a row that no longer matches the filter.
      for (const [key, old] of previousLists) {
        if (!old) continue;
        const params = key[2] as TicketListParams | undefined;
        const leavesFilter =
          (input.status && params?.status && input.status !== params.status) ||
          (input.priority && params?.priority && input.priority !== params.priority);
        queryClient.setQueryData<TicketListResponse>(key, {
          ...old,
          data: leavesFilter
            ? old.data.filter((t) => t.id !== id)
            : old.data.map((t) => (t.id === id ? { ...t, ...input } : t)),
        });
      }
      if (previousDetail) {
        queryClient.setQueryData<Ticket>(ticketKeys.detail(id), { ...previousDetail, ...input });
      }
      return { previousLists, previousDetail, id };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.previousLists) {
        queryClient.setQueryData(key, data);
      }
      if (context.previousDetail) {
        queryClient.setQueryData(ticketKeys.detail(context.id), context.previousDetail);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/api/tickets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}
