import { Router } from 'express';
import * as tickets from '../controllers/tickets.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const ticketsRouter = Router();

// Every ticket operation requires a signed-in user (like Jira/Trello,
// where board access is behind login). Delete additionally needs ADMIN.
ticketsRouter.use(authenticate);

// /stats must be registered before /:id so it isn't captured as an id.
ticketsRouter.get('/stats', tickets.stats);
ticketsRouter.get('/', tickets.list);
ticketsRouter.get('/:id', tickets.getOne);
ticketsRouter.post('/', tickets.create);
ticketsRouter.patch('/:id', tickets.update);
ticketsRouter.delete('/:id', requireRole('ADMIN'), tickets.remove);
