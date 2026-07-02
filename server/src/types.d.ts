import type { AuthUser } from '@ticketdash/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
