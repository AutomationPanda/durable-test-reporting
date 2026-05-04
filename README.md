# durable-test-reporting

**Dashing** — durable live test reporting: a dashboard for test runs with real-time updates and (later) Temporal-backed durable publishing.

This repository is a **npm workspaces** monorepo:

| Workspace   | Stack                                      | Role                          |
| ----------- | ------------------------------------------ | ----------------------------- |
| `frontend/` | React, TypeScript, Vite, Tailwind CSS      | Web UI                        |
| `backend/`  | Express, TypeScript, SQLite (`better-sqlite3`) | HTTP API and persistence |

The current app is a minimal **hello-world** shell: the UI loads, calls `GET /api/hello`, and the API increments a counter stored in SQLite so you can confirm persistence across refreshes.

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** 9+ (ships with recent Node)

Native module: `better-sqlite3` compiles on install. If install fails, ensure build tools are available (e.g. Xcode CLT on macOS).

## Install

From the repository root:

```bash
npm install
```

This installs root dev dependencies (e.g. `concurrently`) and all workspace packages.

## Run (development)

Start **API** and **Vite** together:

```bash
npm run dev
```

Then open **http://localhost:5173** in a browser. The dev server proxies `/api/*` to the API on port **3000**.

- Frontend: http://localhost:5173  
- API: http://localhost:3000 (e.g. http://localhost:3000/api/hello)

SQLite database file (created on first request): `backend/data/dashing.db`

### Run workspaces separately (optional)

```bash
# Terminal 1 — API
npm run dev -w backend

# Terminal 2 — UI
npm run dev -w frontend
```

## Build

```bash
npm run build
```

Produces `backend/dist/` and `frontend/dist/`. Run the compiled API with:

```bash
npm run start
```

Serve `frontend/dist/` with any static host (or `npm run preview -w frontend` for a quick local check). For a full production setup you would typically serve the SPA from Express or a reverse proxy; that is not wired yet in this scaffold.

## Specs

Product and engineering intent live under `specs/`. See `specs/CONSTITUTION.md` for spec-driven workflow.
