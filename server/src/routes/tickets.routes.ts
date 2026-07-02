import { Router } from 'express';
import * as tickets from '../controllers/tickets.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const ticketsRouter = Router();

// /stats must be registered before /:id so it isn't captured as an id.
ticketsRouter.get('/stats', tickets.stats);
ticketsRouter.get('/', tickets.list);
ticketsRouter.get('/:id', tickets.getOne);
ticketsRouter.post('/', tickets.create);
ticketsRouter.patch('/:id', tickets.update);
// Destructive action is the RBAC demonstration: admins only.
ticketsRouter.delete('/:id', authenticate, requireRole('ADMIN'), tickets.remove);
