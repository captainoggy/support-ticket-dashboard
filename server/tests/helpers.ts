import jwt from 'jsonwebtoken';
import type { UserRole } from '@ticketdash/shared';
import { config } from '../src/config';

/**
 * Signs a token with the same payload shape as the login service. JWT
 * verification is stateless (no DB lookup), so tests don't need a seeded
 * user just to call authenticated endpoints.
 */
export function authHeader(role: UserRole = 'AGENT'): { Authorization: string } {
  const token = jwt.sign(
    { email: `${role.toLowerCase()}@test.dev`, name: 'Test User', role },
    config.jwtSecret,
    { subject: '1', expiresIn: '1h' },
  );
  return { Authorization: `Bearer ${token}` };
}
