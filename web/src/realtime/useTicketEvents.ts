import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { ticketKeys } from '../api/hooks';

/**
 * Live updates: the server broadcasts ticket:{created,updated,deleted} with the
 * ticket id; we simply invalidate the ticket cache and let TanStack Query
 * re-fetch through the REST API — one source of truth, two tabs stay in sync.
 */
export function useTicketEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io({ transports: ['websocket'], reconnectionDelayMax: 5000 });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    socket.on('ticket:created', refresh);
    socket.on('ticket:updated', refresh);
    socket.on('ticket:deleted', refresh);
    return () => {
      socket.close();
    };
  }, [queryClient]);
}
