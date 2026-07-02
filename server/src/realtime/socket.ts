import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from '../config.js';

/**
 * Thin realtime layer: events carry only ticket ids and clients re-fetch via
 * REST, so the API stays the single source of truth for ticket data.
 */
let io: Server | null = null;

export type TicketEvent = 'ticket:created' | 'ticket:updated' | 'ticket:deleted';

export function initRealtime(httpServer: HttpServer, origins: string[]): Server {
  io = new Server(httpServer, { cors: { origin: origins } });

  // Same rule as the REST API: no events without a valid token. The client
  // sends it in the handshake's auth payload.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') return next(new Error('Authentication required'));
    try {
      jwt.verify(token, config.jwtSecret);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

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
