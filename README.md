# Support Ticket Dashboard

A support ticket dashboard where users can view, create, and update customer support tickets. Built as a small, production-minded full-stack app: React SPA, Express REST API, PostgreSQL, and a shared validation layer so the frontend and backend always agree on what a valid ticket looks like.

## Quick start (one command)

Requires Docker.

```bash
docker compose up --build
```

Then open **http://localhost:8080**. The stack boots Postgres, applies migrations, seeds about 15 realistic tickets and two demo users, and serves the app. The API is also exposed directly on http://localhost:4000, with interactive Swagger docs at http://localhost:4000/api/docs.

| Demo user | Email | Password | Can |
|---|---|---|---|
| Admin | `admin@demo.dev` | `demo1234` | everything, incl. deleting tickets |
| Agent | `agent@demo.dev` | `demo1234` | everything except delete |

The app opens on a sign-in page; use a demo account from the table above (credentials are deliberately documented only here, never in the UI). Like Jira or Trello, every ticket operation (viewing, creating, updating, filtering) requires a signed-in user; deleting additionally requires the admin role. Passwords can be changed from the avatar menu; restarting the stack resets the demo passwords (the seed upserts them on boot).

## Technologies

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TypeScript, TanStack Query, React Router, react-hook-form, @dnd-kit, Tailwind CSS 4 |
| Backend | Node.js + Express 5 + TypeScript, layered routes → controllers → services → repositories |
| Database | PostgreSQL 16 + Prisma ORM (schema, migrations, seed) |
| Shared | `@ticketdash/shared`: zod schemas used by both API validation and form validation |
| Realtime | socket.io (server broadcasts ticket events, clients re-fetch via REST) |
| Testing | Vitest everywhere. Supertest against a dedicated test DB for the API, Testing Library + MSW for the UI |
| Tooling | npm workspaces monorepo, ESLint + Prettier, GitHub Actions CI, Docker Compose |

## Features

**Core**
- Sign-in required for all ticket operations (JWT). The route guard remembers where you were headed and returns you there after login
- Ticket list with status/priority badges, customer, and relative created date
- Create-ticket form with field-level validation on both client and server, using the same zod schema. New tickets always start `open`
- Status updates via an accessible select on the list, detail page, and board, with optimistic UI, rollback on failure, and toast feedback; priority can be re-triaged from the ticket page the same way
- Ticket detail view with full description, customer info, and timestamps; title, description, and customer fields edit in place (Jira-style: click to edit, Enter/blur saves single-line fields, Escape cancels, description uses explicit Save/Cancel), validated by the same shared schema
- Filtering by status and priority

**Beyond core**
- Kanban board: drag tickets between Open / In Progress / Resolved, and drop them at a specific spot. Cards can also be reordered within a column, and the order survives a refresh. Works with pointer and keyboard, with screen-reader announcements, all through the same PATCH endpoint. On drop, the landed card pulses in its new column's color and (on mobile) the board pans to the destination column
- Clickable KPI stat row (open / in progress / resolved / high-priority open)
- Search across title, customer name, and email; sortable column headers with direction indicators; semantic sorting (priority and status sort by meaning, not alphabetically); pagination with a 10/25/50/100 page-size picker; sticky table header
- Filters, search, sort, and page are synced to the URL, so they survive a refresh, work with the back button, and can be shared
- Live updates over WebSocket: two open tabs stay in sync (the socket authenticates with the same JWT as the API)
- Role-based access on top of auth: `DELETE /api/tickets/:id` is admin-only (401 / 403 / 204)
- Avatar account menu (initials, identity summary, keyboard + click-outside dismissal) with a working change-password flow: current password verified server-side, field-level errors mapped back onto the form
- Expired sessions are caught on the first 401: the app signs you out and returns you to the login page with a message
- OpenAPI docs (Swagger UI) at `/api/docs`
- Health endpoint, request logging (pino), helmet (CSP relaxed only for Swagger UI), CORS allowlist, login rate limiting, env validation at boot, pagination caps, graceful shutdown, non-root API container
- Responsive: the table collapses to cards on mobile; the board keeps its columns side by side with horizontal swipe + per-column scrolling (Jira-style), and touch drag uses long-press so swipes pan instead of dragging
- CI: lint + typecheck + 36 tests + production build on every push

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
npm run test -w server   # 27 API tests (needs the db container running)
npm run test -w web      # 9 UI tests (MSW-mocked, no services needed)
```

The API suite runs against a **separate database** (`ticketdash_test`, created automatically by `docker/postgres-init.sql`) and truncates between tests, so it never touches dev data. In CI the same suite runs against a Postgres service container.

What's covered: every ticket endpoint rejecting unauthenticated requests with 401, board ranking (new tickets on top, reorder persisting, cross-column drop saving status and position together), rejected invalid input with per-field details (missing title, bad email, unknown status, empty PATCH), successful create persisting with forced `open` status, status updates persisting, filtering/search/sorting/pagination semantics, stats aggregation, login success/failure, password change (auth required, wrong current password, too-short new password, old password invalidated), the full 401/403/204 RBAC ladder on delete, list rendering from API data, loading/empty/error/retry states, optimistic status change with toast, inline editing (title save on Enter, invalid email blocked, Escape discarding a description draft), and form validation including mapping server-side field errors back onto inputs.

## Project structure

```
shared/   zod schemas + types shared by client and server (single source of truth)
server/   Express API: routes → controllers → services → repositories, Prisma, tests
web/      React SPA: pages, components, TanStack Query hooks, tests
docker/   Postgres init (creates the test database)
```

### API surface

All `/api/tickets` endpoints require a bearer token (obtained via login); delete also requires the admin role.

```
GET    /api/tickets          list (+ status, priority, q, sortBy, sortDir, page, pageSize)
GET    /api/tickets/stats    counts by status + high-priority-open
GET    /api/tickets/:id      single ticket (404 if missing)
POST   /api/tickets          create: validated, status forced to "open" (201)
PATCH  /api/tickets/:id      partial update incl. status and board position (400 / 404)
DELETE /api/tickets/:id      admin only (403 for agents / 204)
POST   /api/auth/login       public: JWT for a seeded demo user
POST   /api/auth/change-password  verifies current password (204 / 400 / 401)
GET    /api/auth/me          current user
GET    /api/health           public: liveness + DB connectivity
GET    /api/docs             Swagger UI (spec at /api/openapi.json)
WS     socket.io             ticket:created / ticket:updated / ticket:deleted (JWT handshake, ids only)
```

Errors are consistent JSON: `{ "error": "...", "details": [{ "field", "message" }] }`. Validation failures return 400 with per-field messages, missing resources 404, auth failures 401/403, and unexpected errors a logged 500 with no stack leak.

## Deployment (free tier)

Hosted as three free pieces: the frontend on **Vercel**, the API on **Render** (Dockerized, kept as a long-running service for WebSockets), and Postgres on **Neon** (unlike Render's free Postgres, it doesn't expire). The frontend reads `VITE_API_URL` at build time; when unset (local dev, Docker), everything stays same-origin behind the proxy. Config lives in [vercel.json](vercel.json) and [render.yaml](render.yaml).

1. **Database (Neon)**: create a free project at neon.tech and copy the connection string (it already includes `sslmode=require`).
2. **API (Render)**: New → Blueprint → connect the repo. Render reads `render.yaml` and creates `ticketdash-api` (`JWT_SECRET` is generated automatically). Set `DATABASE_URL` to the Neon string and deploy; note the service URL (e.g. `https://ticketdash-api.onrender.com`). The API applies migrations and seeds demo data on first boot.
3. **Frontend (Vercel)**: New Project → import the repo (keep the root directory as the repo root; `vercel.json` handles the monorepo build and SPA routing). Add an env var `VITE_API_URL` = the Render API URL, then deploy; note the Vercel URL (e.g. `https://<project>.vercel.app`).
4. **Connect CORS**: back on Render, set `CLIENT_ORIGINS` to the Vercel URL and redeploy the API. Sign in with the demo users above.

Free-tier caveat: the Render API sleeps after ~15 minutes idle, so the first request can take up to a minute to wake it. The Vercel frontend is always instant and shows its loading state while the API wakes.

## Assumptions & trade-offs

- **PostgreSQL over SQLite** (the brief allows either): ticket data is relational, and its obvious growth path (users, comments, assignments, audit history) is relational too. SQLite is single-writer and file-bound, which breaks at the first moment of real concurrency, and Prisma doesn't support enums on SQLite, so the schema I actually wanted (real `status`/`priority` enum types, which Postgres also orders semantically for sorting) wouldn't even be expressible. Docker Compose cancels out SQLite's zero-setup advantage, since the reviewer runs one command either way.
- **Separate SPA + API over Next.js**: this makes the frontend/backend integration explicit and keeps the backend an independently testable, deployable service. There's no SEO requirement here, so SSR buys nothing.
- **Express over NestJS**: the layered structure (routes/controllers/services/repositories) shows organization without framework ceremony.
- **Everything requires sign-in**, matching how real ticketing tools (Jira, Trello) work: writes are never anonymous, and status changes need an accountable user behind them. The brief describes an anonymous visitor journey, so reviewer friction is kept low instead by documenting the demo accounts in this README (never in the UI) and returning you to wherever you were headed after login. Delete additionally requires the admin role (401 / 403 / 204).
- **Optimistic updates with rollback** on status changes: the UI feels instant, the server stays the source of truth, and errors roll back with a toast.
- **WebSocket events carry only ids.** Clients re-fetch through the REST API, so realtime can never show data the API wouldn't return.
- **JWT in localStorage**, not an httpOnly cookie: simpler for an API + SPA demo. A production deployment should prefer httpOnly cookies with CSRF protection (noted below).
- **The API runs with `tsx` in the container** rather than a precompiled bundle: one less build pipeline in a timeboxed exercise. The web app *is* production-built and served by nginx.
- **Board order is a `position` float** (one custom field beyond the brief's example object): a drop between two cards writes the midpoint of its neighbours, so every drag is a single-row update. In theory repeated splits between the same two cards exhaust float precision after ~50 drops; a production system would renormalize a column occasionally (noted below).
- **The board fetches up to 100 tickets**, while the list view paginates arbitrarily. A real board would virtualize or paginate per column.
- Timebox note: core flows, tests, and docs came first (the commit history shows the order). The optional features were added only after the core was complete and verified.

## With more time

- Ticket comments and a status-change audit trail (the strongest reason the schema is relational)
- E2E tests (Playwright) driving the browser through create, update, and refresh persistence
- httpOnly-cookie sessions with refresh-token rotation; invalidate existing JWTs on password change (token versioning)
- Per-column pagination/virtualization on the board and bulk actions on the list
- Periodic renormalization of board positions (rewrite a column's ranks to integers)
- Ticket assignment to agents, email notifications, saved filter views
- Observability: structured request ids, metrics, error tracking (Sentry)
- Deployment (Fly.io/Render/Railway): both images are ready; add TLS and managed Postgres
