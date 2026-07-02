import { Prisma } from '@prisma/client';
import type {
  CreateTicketInput,
  ListTicketsQuery,
  PaginationMeta,
  UpdateTicketInput,
} from '@ticketdash/shared';
import { NotFoundError } from '../errors.js';
import { emitTicketEvent } from '../realtime/socket.js';
import * as ticketRepo from '../repositories/ticket.repository.js';

function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

export async function listTickets(query: ListTicketsQuery) {
  const { tickets, total } = await ticketRepo.listTickets(query);
  const meta: PaginationMeta = {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
  return { data: tickets, meta };
}

export async function getTicket(id: number) {
  const ticket = await ticketRepo.getTicketById(id);
  if (!ticket) throw new NotFoundError(`Ticket ${id} not found`);
  return ticket;
}

export async function createTicket(input: CreateTicketInput) {
  const ticket = await ticketRepo.createTicket(input);
  emitTicketEvent('ticket:created', { id: ticket.id });
  return ticket;
}

export async function updateTicket(id: number, input: UpdateTicketInput) {
  try {
    const ticket = await ticketRepo.updateTicket(id, input);
    emitTicketEvent('ticket:updated', { id: ticket.id });
    return ticket;
  } catch (err) {
    if (isRecordNotFound(err)) throw new NotFoundError(`Ticket ${id} not found`);
    throw err;
  }
}

export async function deleteTicket(id: number) {
  try {
    await ticketRepo.deleteTicket(id);
    emitTicketEvent('ticket:deleted', { id });
  } catch (err) {
    if (isRecordNotFound(err)) throw new NotFoundError(`Ticket ${id} not found`);
    throw err;
  }
}

export function getTicketStats() {
  return ticketRepo.getTicketStats();
}
