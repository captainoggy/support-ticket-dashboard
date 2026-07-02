import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../errors.js';
import { logger } from '../logger.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }

  // express.json() throws a SyntaxError with a status for malformed JSON bodies.
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    res.status(400).json({ error: 'Request body is not valid JSON' });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
