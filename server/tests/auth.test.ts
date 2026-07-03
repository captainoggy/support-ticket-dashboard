import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { authHeader } from './helpers';

const app = createApp();

// Test-only fixture password, unrelated to any real demo credential.
const TEST_PASSWORD = 'test-only-pass-1';

async function seedUsers() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4); // low cost: it's a test
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
    .send({ email, password: TEST_PASSWORD });
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
      .send({ email: 'admin@demo.dev', password: TEST_PASSWORD });

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
      .send({ email: 'ghost@demo.dev', password: TEST_PASSWORD });

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

describe('POST /api/auth/change-password', () => {
  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'brand-new-pass' });
    expect(response.status).toBe(401);
  });

  it('rejects a wrong current password with a field error, accepts the right one', async () => {
    const token = await login('agent@demo.dev');

    const wrong = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'not-my-password', newPassword: 'brand-new-pass' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.details).toEqual([
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);

    const ok = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'brand-new-pass' });
    expect(ok.status).toBe(204);

    // The old password no longer works; the new one does.
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agent@demo.dev', password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agent@demo.dev', password: 'brand-new-pass' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects a too-short new password', async () => {
    const token = await login('agent@demo.dev');
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'short' });
    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'newPassword' })]),
    );
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
