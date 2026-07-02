import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-db';

/** Sync the Prisma schema into the test database once, before any worker starts. */
export default function globalSetup() {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}
