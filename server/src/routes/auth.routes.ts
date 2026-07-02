import { Router } from 'express';
import type { Request, Response } from 'express';
import { LoginSchema } from '@ticketdash/shared';
import { authenticate } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = LoginSchema.parse(req.body);
  res.json(await authService.login(email, password));
});

authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});
