# durable-test-reporting

**Dashing** — durable live test reporting: a dashboard for test runs with real-time updates and **Temporal**-backed durable publishing of result events to the API.

This repository is an **npm workspaces** monorepo:

| Workspace          | Stack                                           | Role |
| ------------------ | ----------------------------------------------- | ---- |
| `frontend/`        | React, TypeScript, Vite, Tailwind CSS           | Web UI |
| `backend/`         | Express, TypeScript, SQLite (`better-sqlite3`)  | HTTP API and persistence |
| `temporal-worker/` | Temporal TypeScript SDK (workflow + activities) | Durable `POST /api/events` delivery |

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** 9+ (ships with recent Node)

Native module: `better-sqlite3` compiles on install. If install fails, ensure build tools are available (e.g. Xcode CLT on macOS).

**Temporal + Playwright (optional):** for durable publishing and E2E tests you also need **Docker** (for `npm run temporal:up`) *or* the [Temporal CLI](https://docs.temporal.io/cli) (`temporal server start-dev`). Playwright browsers: `npx playwright install` once.

## Install

From the repository root:

```bash
npm install
```

This installs root dev dependencies (e.g. `concurrently`, Playwright, `@temporalio/client`) and all workspace packages.

## Run (development) — dashboard only

Start **API** and **Vite** together:

```bash
npm run dev
```

Then open **http://localhost:5173** in a browser. The dev server proxies `/api/*` to the API on port **3000**.

- Frontend: http://localhost:5173  
- API: http://localhost:3000 (e.g. `GET /api/suites`, `POST /api/events`)

Optional demo data:

```bash
npm run seed
```

SQLite database file: `backend/data/dashing.db`

### Run workspaces separately (optional)

```bash
# Terminal 1 — API
npm run dev -w backend

# Terminal 2 — UI
npm run dev -w frontend
```

## Run locally (Temporal durable publishing)

Use this when you want **Playwright** (or any client using `tests/support/dashingTemporalPublisher.ts`) to send events **through Temporal** so the **worker** retries HTTP delivery to Dashing if the API or network is down.

You need **three** processes: Temporal Server, Dashing API, and the **Temporal worker**. More detail—**signals vs activities**, **retries**, and **idempotency**: [`specs/engineering/temporal-publisher.md`](specs/engineering/temporal-publisher.md).

### 1. Start Temporal Server

**Option A — Docker (repo compose file):**

```bash
npm run temporal:up
```

Listens on **7233** by default. Tear down (including Postgres volume):

```bash
npm run temporal:down
```

**Namespace:** the worker and Playwright client use Temporal’s built-in **`default`** namespace unless you set `TEMPORAL_NAMESPACE` (e.g. for Temporal Cloud).

**Option B — Temporal CLI (no Docker):**

Install the CLI if needed — e.g. **macOS:** `brew install temporal` — then:

```bash
temporal server start-dev
```

### 2. Start Dashing API

In another terminal (from repo root):

```bash
npm run dev
```

…or API only: `npm run dev -w backend`. The worker posts to **`http://127.0.0.1:3000`** by default (`DASHING_API_URL` overrides).

### 3. Start the Temporal worker

In another terminal:

```bash
npm run temporal:dev
```

This runs the `temporal-worker` package on task queue **`dashing-publish`** (override with `TEMPORAL_TASK_QUEUE` if you change it everywhere).

### 4. (Optional) Playwright integration test

With Temporal, API, and worker all up:

```bash
npm run test:e2e:dashing
```

The test in `tests/dashing-temporal.spec.ts` is **skipped** if nothing is listening on `TEMPORAL_ADDRESS` (default `127.0.0.1:7233`). All Playwright tests: `npm run test:e2e`.

### Environment variables (summary)

| Variable | Default | Used by |
| -------- | ------- | ------- |
| `TEMPORAL_ADDRESS` | `127.0.0.1:7233` | Worker, Playwright client |
| `TEMPORAL_NAMESPACE` | `default` | Worker and Playwright client |
| `TEMPORAL_TASK_QUEUE` | `dashing-publish` | Worker (must match publisher) |
| `DASHING_API_URL` | `http://127.0.0.1:3000` | Worker activities only |
| `TEMPORAL_CONNECT_RETRIES` | `15` | Worker: gRPC connect attempts before exit (raise for slow Docker hosts) |
| `TEMPORAL_CONNECT_RETRY_MS` | `2000` | Worker: delay between those retries (ms) |

## Build

```bash
npm run build
```

Produces `backend/dist/`, `frontend/dist/`, and `temporal-worker/dist/`. Run the compiled API with:

```bash
npm run start
```

Serve `frontend/dist/` with any static host (or `npm run preview -w frontend` for a quick local check). For a full production setup you would typically serve the SPA from Express or a reverse proxy; that is not wired yet in this scaffold.

Compiled worker:

```bash
node temporal-worker/dist/worker.js
```

## Specs

Product and engineering intent live under `specs/`. See `specs/CONSTITUTION.md` for spec-driven workflow.
