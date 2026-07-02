import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { ticketKeys } from '../api/hooks';
import { getStoredToken } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * Live updates: the server broadcasts ticket:{created,updated,deleted} with the
 * ticket id; we simply invalidate the ticket cache and let TanStack Query
 * re-fetch through the REST API — one source of truth, two tabs stay in sync.
 * The socket authenticates with the same JWT as the REST API and only exists
 * while someone is signed in.
 */
export function useTicketEvents() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const socket = io({
      transports: ['websocket'],
      reconnectionDelayMax: 5000,
      auth: { token: getStoredToken() },
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    socket.on('ticket:created', refresh);
    socket.on('ticket:updated', refresh);
    socket.on('ticket:deleted', refresh);
    return () => {
      socket.close();
    };
  }, [queryClient, user]);
}
