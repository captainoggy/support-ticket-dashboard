import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').optional(),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8080'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast at boot: a misconfigured server should never come up half-working.
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
  console.error('JWT_SECRET is required in production.');
  process.exit(1);
}

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  // Dev/test fallback keeps local setup frictionless; production exits above without a real secret.
  jwtSecret: env.JWT_SECRET ?? 'insecure-dev-secret-do-not-use-in-prod',
  clientOrigins: env.CLIENT_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
