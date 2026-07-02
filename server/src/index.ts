import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { logger } from './logger.js';
import { closeRealtime, initRealtime } from './realtime/socket.js';

const server = http.createServer(createApp());
initRealtime(server, config.clientOrigins);

server.listen(config.port, () => {
  logger.info(`API listening on http://localhost:${config.port} (docs at /api/docs)`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  closeRealtime();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  // Failsafe: don't hang forever on stuck connections.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
