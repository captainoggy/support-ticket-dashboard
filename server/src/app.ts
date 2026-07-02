import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { prisma } from './db.js';
import { openapiSpec } from './docs/openapi.js';
import { logger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { ticketsRouter } from './routes/tickets.routes.js';

export function createApp() {
  const app = express();

  // CSP is disabled because Swagger UI relies on inline scripts; everything else
  // helmet sets (nosniff, frame denial, etc.) stays on.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: '100kb' }));
  if (config.env !== 'test') {
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  }

  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: true });
    } catch {
      res.status(503).json({ status: 'degraded', db: false });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/tickets', ticketsRouter);

  app.get('/api/openapi.json', (_req: Request, res: Response) => res.json(openapiSpec));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, { customSiteTitle: 'Ticket API docs' }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
