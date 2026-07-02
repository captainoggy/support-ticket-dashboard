import type { Request, Response } from 'express';
import { CreateTicketSchema, ListTicketsQuerySchema, UpdateTicketSchema } from '@ticketdash/shared';
import { z } from 'zod';
import { ApiError } from '../errors.js';
import * as ticketService from '../services/ticket.service.js';

const IdSchema = z.coerce.number().int().positive();

function parseId(raw: unknown): number {
  const result = IdSchema.safeParse(raw);
  if (!result.success) throw new ApiError(400, 'Ticket id must be a positive integer');
  return result.data;
}

export async function list(req: Request, res: Response) {
  const query = ListTicketsQuerySchema.parse(req.query);
  res.json(await ticketService.listTickets(query));
}

export async function stats(_req: Request, res: Response) {
  res.json(await ticketService.getTicketStats());
}

export async function getOne(req: Request, res: Response) {
  const id = parseId(req.params.id);
  res.json(await ticketService.getTicket(id));
}

export async function create(req: Request, res: Response) {
  const input = CreateTicketSchema.parse(req.body);
  const ticket = await ticketService.createTicket(input);
  res.status(201).json(ticket);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const input = UpdateTicketSchema.parse(req.body);
  res.json(await ticketService.updateTicket(id, input));
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id);
  await ticketService.deleteTicket(id);
  res.status(204).end();
}
