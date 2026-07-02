import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { LoginResponse } from '@ticketdash/shared';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { ApiError, UnauthorizedError } from '../errors.js';

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

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    // 400 with a field detail so the form can put the error on the right input.
    throw new ApiError(400, 'Validation failed', [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
