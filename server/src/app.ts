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

  // One proxy hop (nginx) sets X-Forwarded-For, so req.ip — which the login
  // rate limiter keys on — is the real client address.
  app.set('trust proxy', 1);

  // Swagger UI relies on inline scripts, so CSP is relaxed for /api/docs only;
  // every other route gets helmet's full default set.
  const standardHelmet = helmet();
  const docsHelmet = helmet({ contentSecurityPolicy: false });
  app.use((req, res, next) =>
    req.path.startsWith('/api/docs') ? docsHelmet(req, res, next) : standardHelmet(req, res, next),
  );
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
