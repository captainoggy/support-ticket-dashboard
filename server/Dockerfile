# Build context is the repo root (workspaces need the root package files).
FROM node:20-alpine

WORKDIR /app

# Install with the lockfile first so Docker layer caching survives code changes.
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
# postinstall runs `prisma generate`, which needs the schema.
COPY server/prisma server/prisma
RUN npm ci --workspace @ticketdash/server --include-workspace-root=false

COPY shared shared
COPY server server

ENV NODE_ENV=development
EXPOSE 4000

# Apply migrations and (idempotently) seed on boot, then start the API.
CMD ["sh", "-c", "npx -w server prisma migrate deploy && npm run -w server db:seed && npm run -w server start"]
