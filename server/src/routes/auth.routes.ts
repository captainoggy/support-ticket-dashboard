import { Router } from 'express';
import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { LoginSchema } from '@ticketdash/shared';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';

export const authRouter = Router();

// Slow down credential guessing: 10 attempts per IP per 15 minutes. Disabled
// in tests, where every run makes several legitimate logins from one address.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'test',
  handler: (_req, res) =>
    res.status(429).json({ error: 'Too many login attempts. Try again in a few minutes.' }),
});

authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = LoginSchema.parse(req.body);
  res.json(await authService.login(email, password));
});

authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});
