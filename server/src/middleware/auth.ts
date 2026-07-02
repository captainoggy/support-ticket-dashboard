import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser, UserRole } from '@ticketdash/shared';
import { config } from '../config.js';
import { ForbiddenError, UnauthorizedError } from '../errors.js';

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token');
  }
  try {
    const payload = jwt.verify(header.slice('Bearer '.length), config.jwtSecret) as TokenPayload;
    const user: AuthUser = {
      id: Number(payload.sub),
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    req.user = user;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role !== role) {
      throw new ForbiddenError(`This action requires the ${role} role`);
    }
    next();
  };
}
