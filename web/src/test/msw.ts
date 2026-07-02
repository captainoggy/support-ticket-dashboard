import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Ticket } from '@ticketdash/shared';

export const fixtureTickets: Ticket[] = [
  {
    id: 1,
    title: 'Unable to complete payment',
    description: 'Card declined on checkout.',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    status: 'open',
    priority: 'high',
    position: 1,
    createdAt: '2026-06-30T10:30:00.000Z',
    updatedAt: '2026-06-30T10:30:00.000Z',
  },
  {
    id: 2,
    title: 'Dashboard loads slowly',
    description: 'Takes 30 seconds on Safari.',
    customerName: 'Tom Okafor',
    customerEmail: 'tom@example.com',
    status: 'in_progress',
    priority: 'medium',
    position: 2,
    createdAt: '2026-06-28T09:00:00.000Z',
    updatedAt: '2026-06-29T12:00:00.000Z',
  },
];

export const handlers = [
  http.get('/api/tickets', () =>
    HttpResponse.json({
      data: fixtureTickets,
      meta: { page: 1, pageSize: 10, total: fixtureTickets.length, totalPages: 1 },
    }),
  ),
  http.get('/api/tickets/stats', () =>
    HttpResponse.json({ open: 1, inProgress: 1, resolved: 0, highPriorityOpen: 1 }),
  ),
  http.get('/api/tickets/:id', ({ params }) => {
    const ticket = fixtureTickets.find((t) => t.id === Number(params.id));
    return ticket ? HttpResponse.json(ticket) : new HttpResponse(null, { status: 404 });
  }),
  http.patch('/api/tickets/:id', async ({ request, params }) => {
    const ticket = fixtureTickets.find((t) => t.id === Number(params.id));
    if (!ticket) return new HttpResponse(null, { status: 404 });
    // Persist into the fixture so re-fetches after the optimistic update agree.
    Object.assign(ticket, (await request.json()) as Partial<Ticket>);
    return HttpResponse.json(ticket);
  }),
];

export const server = setupServer(...handlers);
