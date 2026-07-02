import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { LoginResponse } from '@ticketdash/shared';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { UnauthorizedError } from '../errors.js';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Same error for unknown email and wrong password — don't leak which accounts exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }
  const token = jwt.sign(
    { email: user.email, name: user.name, role: user.role },
    config.jwtSecret,
    { subject: String(user.id), expiresIn: '24h' },
  );
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
