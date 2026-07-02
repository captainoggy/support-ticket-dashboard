import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { authHeader } from './helpers';

const app = createApp();

async function seedUsers() {
  const passwordHash = await bcrypt.hash('demo1234', 4); // low cost: it's a test
  await prisma.user.createMany({
    data: [
      { email: 'admin@demo.dev', name: 'Ada Admin', role: 'ADMIN', passwordHash },
      { email: 'agent@demo.dev', name: 'Alex Agent', role: 'AGENT', passwordHash },
    ],
  });
}

async function login(email: string): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'demo1234' });
  return response.body.token;
}

async function createTicket(): Promise<number> {
  const response = await request(app).post('/api/tickets').set(authHeader()).send({
    title: 'Delete me',
    description: 'Ticket used by the RBAC tests.',
    customerName: 'Sam Doe',
    customerEmail: 'sam@example.com',
    priority: 'low',
  });
  return response.body.id;
}

beforeEach(seedUsers);

describe('POST /api/auth/login', () => {
  it('returns a token and the user for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.dev', password: 'demo1234' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user).toMatchObject({ email: 'admin@demo.dev', role: 'ADMIN' });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password with the same message as an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.dev', password: 'nope' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@demo.dev', password: 'demo1234' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const token = await login('agent@demo.dev');
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ email: 'agent@demo.dev', role: 'AGENT' });
  });

  it('rejects a missing or garbage token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/auth/me').set('Authorization', 'Bearer nonsense')).status,
    ).toBe(401);
  });
});

describe('DELETE /api/tickets/:id (admin only)', () => {
  it('is denied anonymously (401) and for agents (403), allowed for admins (204)', async () => {
    const id = await createTicket();

    expect((await request(app).delete(`/api/tickets/${id}`)).status).toBe(401);

    const agentToken = await login('agent@demo.dev');
    expect(
      (await request(app).delete(`/api/tickets/${id}`).set('Authorization', `Bearer ${agentToken}`))
        .status,
    ).toBe(403);

    const adminToken = await login('admin@demo.dev');
    expect(
      (await request(app).delete(`/api/tickets/${id}`).set('Authorization', `Bearer ${adminToken}`))
        .status,
    ).toBe(204);

    // Actually gone.
    expect((await request(app).get(`/api/tickets/${id}`).set(authHeader())).status).toBe(404);
  });
});
