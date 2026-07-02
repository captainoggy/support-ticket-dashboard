import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { authHeader } from './helpers';

const app = createApp();
const auth = authHeader();

const validTicket = {
  title: 'Printer on fire',
  description: 'Smoke is coming out of the office printer.',
  customerName: 'Sam Doe',
  customerEmail: 'sam@example.com',
  priority: 'high',
};

async function seedTickets() {
  await prisma.ticket.createMany({
    data: [
      { ...validTicket, title: 'Payment fails at checkout', status: 'open', priority: 'high' },
      {
        ...validTicket,
        title: 'Slow dashboard',
        customerName: 'Ada Lovelace',
        customerEmail: 'ada@example.com',
        status: 'in_progress',
        priority: 'medium',
      },
      { ...validTicket, title: 'Typo on pricing page', status: 'resolved', priority: 'low' },
    ],
  });
}

describe('authentication requirement', () => {
  it('rejects every ticket operation without a token', async () => {
    expect((await request(app).get('/api/tickets')).status).toBe(401);
    expect((await request(app).get('/api/tickets/1')).status).toBe(401);
    expect((await request(app).get('/api/tickets/stats')).status).toBe(401);
    expect((await request(app).post('/api/tickets').send(validTicket)).status).toBe(401);
    expect(
      (await request(app).patch('/api/tickets/1').send({ status: 'resolved' })).status,
    ).toBe(401);
  });
});

describe('POST /api/tickets', () => {
  it('rejects a ticket without a title with per-field details', async () => {
    const { title: _title, ...missingTitle } = validTicket;
    const response = await request(app).post('/api/tickets').set(auth).send(missingTitle);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'title' })]),
    );
  });

  it('rejects an invalid customer email', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set(auth)
      .send({ ...validTicket, customerEmail: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'customerEmail', message: 'Enter a valid email address' }),
      ]),
    );
  });

  it('creates a valid ticket, stores it, and forces status to open', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set(auth)
      .send({ ...validTicket, status: 'resolved' }); // status from clients is ignored

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ...validTicket, status: 'open' });
    expect(response.body.id).toBeGreaterThan(0);

    const stored = await prisma.ticket.findUnique({ where: { id: response.body.id } });
    expect(stored?.status).toBe('open');
    expect(stored?.title).toBe(validTicket.title);
  });
});

describe('PATCH /api/tickets/:id', () => {
  it('saves a status update', async () => {
    const created = await request(app).post('/api/tickets').set(auth).send(validTicket);

    const patched = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set(auth)
      .send({ status: 'in_progress' });
    expect(patched.status).toBe(200);
    expect(patched.body.status).toBe('in_progress');

    // Persisted, not just echoed.
    const fetched = await request(app).get(`/api/tickets/${created.body.id}`).set(auth);
    expect(fetched.body.status).toBe('in_progress');
  });

  it('rejects an unknown status value', async () => {
    const created = await request(app).post('/api/tickets').set(auth).send(validTicket);
    const response = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set(auth)
      .send({ status: 'done' });
    expect(response.status).toBe(400);
  });

  it('rejects an empty update', async () => {
    const created = await request(app).post('/api/tickets').set(auth).send(validTicket);
    const response = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set(auth)
      .send({});
    expect(response.status).toBe(400);
  });

  it('returns 404 for a missing ticket', async () => {
    const response = await request(app)
      .patch('/api/tickets/9999')
      .set(auth)
      .send({ status: 'resolved' });
    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/not found/i);
  });
});

describe('board ordering (position)', () => {
  it('ranks new tickets on top and persists a reorder', async () => {
    const first = await request(app).post('/api/tickets').set(auth).send(validTicket);
    const second = await request(app)
      .post('/api/tickets')
      .set(auth)
      .send({ ...validTicket, title: 'Newer ticket' });

    // Newer tickets get a lower position, so they rank first.
    const before = await request(app).get('/api/tickets?sortBy=position&sortDir=asc').set(auth);
    expect(before.body.data.map((t: { id: number }) => t.id)).toEqual([
      second.body.id,
      first.body.id,
    ]);

    // Drag the older ticket above the newer one.
    await request(app)
      .patch(`/api/tickets/${first.body.id}`)
      .set(auth)
      .send({ position: second.body.position - 1 });

    const after = await request(app).get('/api/tickets?sortBy=position&sortDir=asc').set(auth);
    expect(after.body.data.map((t: { id: number }) => t.id)).toEqual([
      first.body.id,
      second.body.id,
    ]);
  });

  it('saves status and position together (cross-column drop)', async () => {
    const created = await request(app).post('/api/tickets').set(auth).send(validTicket);

    const patched = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set(auth)
      .send({ status: 'in_progress', position: 2.5 });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ status: 'in_progress', position: 2.5 });

    const fetched = await request(app).get(`/api/tickets/${created.body.id}`).set(auth);
    expect(fetched.body).toMatchObject({ status: 'in_progress', position: 2.5 });
  });
});

describe('GET /api/tickets', () => {
  beforeEach(seedTickets);

  it('filters by status', async () => {
    const response = await request(app).get('/api/tickets?status=open').set(auth);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Payment fails at checkout');
  });

  it('filters by priority', async () => {
    const response = await request(app).get('/api/tickets?priority=medium').set(auth);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].priority).toBe('medium');
  });

  it('searches title and customer name case-insensitively', async () => {
    const byTitle = await request(app).get('/api/tickets?q=PRICING').set(auth);
    expect(byTitle.body.data.map((t: { title: string }) => t.title)).toEqual([
      'Typo on pricing page',
    ]);

    const byCustomer = await request(app).get('/api/tickets?q=lovelace').set(auth);
    expect(byCustomer.body.data).toHaveLength(1);
    expect(byCustomer.body.data[0].customerName).toBe('Ada Lovelace');
  });

  it('sorts by priority semantically (high first on desc)', async () => {
    const response = await request(app).get('/api/tickets?sortBy=priority&sortDir=desc').set(auth);
    expect(response.body.data.map((t: { priority: string }) => t.priority)).toEqual([
      'high',
      'medium',
      'low',
    ]);
  });

  it('paginates with meta', async () => {
    const response = await request(app).get('/api/tickets?page=2&pageSize=2').set(auth);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('rejects an invalid filter value', async () => {
    const response = await request(app).get('/api/tickets?status=bogus').set(auth);
    expect(response.status).toBe(400);
  });
});

describe('GET /api/tickets/:id', () => {
  it('returns the ticket', async () => {
    const created = await request(app).post('/api/tickets').set(auth).send(validTicket);
    const response = await request(app).get(`/api/tickets/${created.body.id}`).set(auth);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe(validTicket.title);
  });

  it('returns 404 for a missing ticket and 400 for a bad id', async () => {
    expect((await request(app).get('/api/tickets/424242').set(auth)).status).toBe(404);
    expect((await request(app).get('/api/tickets/abc').set(auth)).status).toBe(400);
  });
});

describe('GET /api/tickets/stats', () => {
  it('aggregates counts by status and high-priority open', async () => {
    await seedTickets();
    const response = await request(app).get('/api/tickets/stats').set(auth);
    expect(response.body).toEqual({ open: 1, inProgress: 1, resolved: 1, highPriorityOpen: 1 });
  });
});
