import type { Prisma, Ticket } from '@prisma/client';
import type { CreateTicketInput, ListTicketsQuery, UpdateTicketInput } from '@ticketdash/shared';
import { prisma } from '../db.js';

function buildWhere(query: ListTicketsQuery): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { customerName: { contains: query.q, mode: 'insensitive' } },
      { customerEmail: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function listTickets(
  query: ListTicketsQuery,
): Promise<{ tickets: Ticket[]; total: number }> {
  const where = buildWhere(query);
  // Postgres orders enums by definition order (low < medium < high), so
  // sorting by priority is semantic for free. Secondary keys keep pagination stable.
  const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
    { [query.sortBy]: query.sortDir },
    ...(query.sortBy !== 'createdAt' ? [{ createdAt: 'desc' as const }] : []),
    { id: 'desc' },
  ];

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);
  return { tickets, total };
}

export function getTicketById(id: number): Promise<Ticket | null> {
  return prisma.ticket.findUnique({ where: { id } });
}

export function createTicket(input: CreateTicketInput): Promise<Ticket> {
  // Status is intentionally not accepted from the client: new tickets are always open.
  return prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({ data: { ...input, status: 'open' } });
    // -id: each new ticket ranks above everything before it (lower position =
    // higher in the column), so it appears at the top of the Open column.
    return tx.ticket.update({ where: { id: created.id }, data: { position: -created.id } });
  });
}

export function updateTicket(id: number, input: UpdateTicketInput): Promise<Ticket> {
  return prisma.ticket.update({ where: { id }, data: input });
}

export function deleteTicket(id: number): Promise<Ticket> {
  return prisma.ticket.delete({ where: { id } });
}

export async function getTicketStats() {
  // Promise.all rather than $transaction: independent read-only counts, and
  // Prisma's groupBy result typing degrades inside a $transaction array.
  const [grouped, highPriorityOpen] = await Promise.all([
    prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.ticket.count({ where: { status: 'open', priority: 'high' } }),
  ]);
  const countFor = (status: Ticket['status']) =>
    grouped.find((g) => g.status === status)?._count._all ?? 0;
  return {
    open: countFor('open'),
    inProgress: countFor('in_progress'),
    resolved: countFor('resolved'),
    highPriorityOpen,
  };
}
