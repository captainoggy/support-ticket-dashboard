# Support Ticket Dashboard

A support ticket dashboard where users can view, create, and update customer support tickets — built as a small production-minded full-stack application: React SPA, Express REST API, PostgreSQL, and a shared validation layer so the frontend and backend can never disagree about what a valid ticket is.

## Quick start (one command)

Requires Docker.

```bash
docker compose up --build
```

Then open **http://localhost:8080**. The stack boots Postgres, applies migrations, seeds ~15 realistic tickets and two demo users, and serves the app. The API is also exposed directly on http://localhost:4000 with interactive Swagger docs at http://localhost:4000/api/docs.

| Demo user | Email | Password | Can |
|---|---|---|---|
| Admin | `admin@demo.dev` | `demo1234` | everything, incl. deleting tickets |
| Agent | `agent@demo.dev` | `demo1234` | everything except delete |

Signing in is **not** required for the core flows (viewing, creating, updating, filtering) — auth exists to demonstrate JWT + role-based access on the destructive action.

## Technologies

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript, TanStack Query, React Router, react-hook-form, @dnd-kit, Tailwind CSS 4 |
| Backend | Node.js + Express 5 + TypeScript, layered routes → controllers → services → repositories |
| Database | PostgreSQL 16 + Prisma ORM (schema, migrations, seed) |
| Shared | `@ticketdash/shared` — zod schemas used by both API validation and form validation |
| Realtime | socket.io (server broadcasts ticket events; clients re-fetch via REST) |
| Testing | Vitest everywhere — Supertest against a dedicated test DB (API), Testing Library + MSW (UI) |
| Tooling | npm workspaces monorepo, ESLint + Prettier, GitHub Actions CI, Docker Compose |

## Features

**Core**
- Ticket list with status/priority badges, customer, relative created date
- Create-ticket form with field-level validation (client **and** server, same zod schema); new tickets always start `open`
- Status updates via an accessible select on the list, detail page, and board — optimistic UI with rollback and toast feedback
- Ticket detail view with full description, customer info, and timestamps
- Filtering by status **and** priority

**Beyond core**
- Kanban board — drag tickets between Open / In Progress / Resolved (pointer + keyboard, with screen-reader announcements); persists via the same PATCH endpoint
- Clickable KPI stat row (open / in progress / resolved / high-priority open)
- Search across title, customer name, and email; semantic sorting (priority sorts high→low, not alphabetically); pagination
- Filters, search, sort, and page are URL-synced — refresh-proof, back-button friendly, shareable
- Live updates over WebSocket: two open tabs stay in sync
- JWT auth with roles; `DELETE /api/tickets/:id` is admin-only (401 / 403 / 204)
- OpenAPI docs (Swagger UI) at `/api/docs`
- Health endpoint, request logging (pino), helmet, CORS allowlist, env validation at boot, pagination caps, graceful shutdown
- Responsive: the table collapses to cards on mobile; board columns stack
- CI: lint + typecheck + 27 tests + production build on every push

## Local development

Prereqs: Node 20+, Docker (for Postgres only).

```bash
npm install                 # installs all workspaces
cp .env.example server/.env # local API config (dev-only defaults)
npm run db:up               # start Postgres (host port 5433)
npm run db:migrate          # apply migrations   (npm -w server run db:migrate)
npm run db:seed             # seed tickets + demo users
npm run dev                 # API on :4000 + Vite on :5173 (proxies /api)
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/socket.io` to the API, so everything is same-origin in dev too.

## Tests

```bash
npm test            # API suite + UI suite
npm run test -w server   # 21 API tests (needs the db container running)
npm run test -w web      # 6 UI tests (MSW-mocked, no services needed)
```

The API suite runs against a **separate database** (`ticketdash_test`, created automatically by `docker/postgres-init.sql`) and truncates between tests — it never touches dev data. In CI the same suite runs against a Postgres service container.

What's covered: rejected invalid input with per-field details (missing title, bad email, unknown status, empty PATCH), successful create persisting with forced `open` status, status updates persisting, filtering/search/sorting/pagination semantics, stats aggregation, login success/failure, the full 401/403/204 RBAC ladder on delete, list rendering from API data, loading/empty/error/retry states, optimistic status change with toast, and form validation incl. mapping server-side field errors back onto inputs.

## Project structure

```
shared/   zod schemas + types shared by client and server (single source of truth)
server/   Express API — routes → controllers → services → repositories, Prisma, tests
web/      React SPA — pages, components, TanStack Query hooks, tests
docker/   Postgres init (creates the test database)
```

### API surface

```
GET    /api/tickets          list (+ status, priority, q, sortBy, sortDir, page, pageSize)
GET    /api/tickets/stats    counts by status + high-priority-open
GET    /api/tickets/:id      single ticket (404 if missing)
POST   /api/tickets          create — validated, status forced to "open" (201)
PATCH  /api/tickets/:id      partial update incl. status (400 invalid / 404 missing)
DELETE /api/tickets/:id      admin only (401 / 403 / 204)
POST   /api/auth/login       JWT for a seeded demo user
GET    /api/auth/me          current user
GET    /api/health           liveness + DB connectivity
GET    /api/docs             Swagger UI (spec at /api/openapi.json)
WS     socket.io             ticket:created / ticket:updated / ticket:deleted
```

Errors are consistent JSON: `{ "error": "...", "details": [{ "field", "message" }] }` — validation failures return 400 with per-field messages, missing resources 404, auth failures 401/403, unexpected errors a logged 500 with no stack leak.

## Assumptions & trade-offs

- **PostgreSQL over SQLite** (the brief allows either): ticket data is relational and its obvious growth path — users, comments, assignments, audit history — is relational. SQLite is single-writer and file-bound, which fails at the first moment of real concurrency, and Prisma doesn't support enums on SQLite, so the correct schema (real `status`/`priority` enum types, which Postgres also orders semantically for sorting) wouldn't even be expressible. Docker Compose neutralizes SQLite's zero-setup advantage — the reviewer runs one command either way.
- **Separate SPA + API over Next.js**: makes the frontend↔backend integration explicit and keeps the backend an independently testable, deployable service. No SEO requirement here, so SSR buys nothing.
- **Express over NestJS**: the layered structure (routes/controllers/services/repositories) demonstrates organization without framework ceremony.
- **Core flows are public; auth guards the destructive action.** The brief's user journey is a visitor who views, creates, updates, and filters — forcing login would break that. JWT + `requireRole` protect delete, demonstrating the pattern where it matters most.
- **Optimistic updates with rollback** on status changes: instant UI, server remains the source of truth, errors roll back and toast.
- **WebSocket events carry only ids** — clients re-fetch through the REST API, so realtime can never show data the API wouldn't return.
- **JWT in localStorage**, not an httpOnly cookie: simpler for an API + SPA demo; a production deployment should prefer httpOnly cookies with CSRF protection (noted below).
- **The API runs with `tsx` in the container** rather than a precompiled bundle — one less build pipeline in a timeboxed exercise; the web app *is* production-built and served by nginx.
- **Board fetches up to 100 tickets**; the list view paginates arbitrarily. A real board would virtualize/paginate per column.
- Timebox note: core flows, tests, and docs came first (the commit history shows the order); the optional features were added only after the core was complete and verified.

## With more time

- Ticket comments and a status-change audit trail (the strongest reason the schema is relational)
- E2E tests (Playwright) driving the browser through create → update → refresh persistence
- httpOnly-cookie sessions with refresh-token rotation; rate limiting on login
- Per-column pagination/virtualization on the board; bulk actions on the list
- Ticket assignment to agents, email notifications, saved filter views
- Observability: structured request ids, metrics, error tracking (Sentry)
- Deployment (Fly.io/Render/Railway): both images are ready; add TLS and managed Postgres
