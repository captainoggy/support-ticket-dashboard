/** The suite runs against a dedicated database (created by docker/postgres-init.sql
 *  locally, or provided via TEST_DATABASE_URL in CI) — never the dev data. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/ticketdash_test';
