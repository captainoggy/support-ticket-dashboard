import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { ticketKeys } from '../api/hooks';
import { API_BASE, getStoredToken } from '../api/client';
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
    const options = {
      transports: ['websocket'] as ['websocket'],
      reconnectionDelayMax: 5000,
      auth: { token: getStoredToken() },
    };
    // Same origin by default; a cross-origin API (VITE_API_URL) is dialed directly.
    const socket = API_BASE ? io(API_BASE, options) : io(options);
    const refresh = () => queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    socket.on('ticket:created', refresh);
    socket.on('ticket:updated', refresh);
    socket.on('ticket:deleted', refresh);
    return () => {
      socket.close();
    };
  }, [queryClient, user]);
}
