import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

/**
 * Thin realtime layer: events carry only ticket ids and clients re-fetch via
 * REST, so the API stays the single source of truth for ticket data.
 */
let io: Server | null = null;

export type TicketEvent = 'ticket:created' | 'ticket:updated' | 'ticket:deleted';

export function initRealtime(httpServer: HttpServer, origins: string[]): Server {
  io = new Server(httpServer, { cors: { origin: origins } });
  return io;
}

export function emitTicketEvent(event: TicketEvent, payload: { id: number }) {
  // No-op when realtime isn't initialized (e.g. in the API test suite).
  io?.emit(event, payload);
}

export function closeRealtime() {
  io?.close();
  io = null;
}
