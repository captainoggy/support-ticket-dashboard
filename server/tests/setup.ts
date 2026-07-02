import { afterAll, beforeEach } from 'vitest';
import { TEST_DATABASE_URL } from './test-db';

// Must happen before anything imports src/db.ts (setup files run first, and
// dotenv never overrides an already-set variable).
process.env.DATABASE_URL = TEST_DATABASE_URL;

const { prisma } = await import('../src/db');

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Ticket", "User" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
