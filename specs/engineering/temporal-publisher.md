# Temporal — durable event publishing

This document describes how **Playwright (and other publishers)** send Dashing **test result events** through **Temporal** so delivery survives Dashing or network outages. It complements [`http-api.md`](http-api.md) (HTTP ingest) and [`test-result-events.md`](test-result-events.md) (event shapes).

## Roles

| Component | Responsibility |
| --------- | ---------------- |
| **Publisher** (e.g. Playwright tests) | Emits events as **signals** to a suite-scoped workflow (`@temporalio/client`). |
| **Temporal Server** | Durable workflow + signal history. |
| **Temporal worker** (`temporal-worker` package) | Runs the **workflow** (deterministic queue) and **activities** (HTTP `POST /api/events` with retries). |
| **Dashing API** | Ingests events as today; unchanged contract. |

## Workflow model

- **One workflow per suite run**, keyed by `workflowId = dashing-publish-{suiteUuid}`.
- **Workflow type**: `dashingSuitePublishWorkflow` — waits for signals `dashingEvent`, each carrying one [`DashingEvent`](../../temporal-worker/src/dashingEvent.ts) payload (same JSON as `POST /api/events`).
- **Activity** `publishDashingEvent`: POST to `DASHING_API_URL` (default `http://127.0.0.1:3000`) with exponential **retries** until success or max attempts.
- **Completion**: after a `suite_end` event is successfully published, the workflow drains any remaining queued signals, then **completes**.

Publishers should use a **run-wide stable `suiteUuid`** when the same logical suite must survive process boundaries (e.g. Playwright worker restart). See Playwright `globalSetup` + `tests/support/playwrightRunSuiteId.ts`; otherwise a fresh UUID per run is fine.

## Signals vs activities (why both)

| Mechanism | Role in this repo | Temporal rules |
| --------- | ------------------ | ---------------- |
| **Signals** (`dashingEvent`) | Ingest **test result events** from publishers into the workflow. The handler only appends to an in-memory queue—**deterministic**, no I/O. | Workflow code must be deterministic and non-blocking. Signals are recorded in workflow history and redelivered on replay; the handler runs again as part of replay. |
| **Activities** (`publishDashingEvent`) | **Side effects**: HTTP `POST` to Dashing. **Retries** apply here (network, 5xx, process crash). | Activities may perform non-deterministic work and can run on any worker; Temporal guarantees **at-least-once** execution while retrying until the configured policy stops. |

**Do not** call `fetch`, databases, or clocks from the workflow body (beyond what the SDK allows for workflow time). Those belong in activities (or local activities if you introduce them later).

## Idempotency and duplicates

Several layers can deliver the **same logical event more than once**:

1. **Activity retries** — If `publishDashingEvent` fails after Dashing accepted the request but before the activity returned, or on ambiguous timeouts, Temporal may **retry** the activity. The API may see **duplicate POSTs** for the same payload.
2. **Duplicate signals** — Publishers should not double-send intentionally, but replays, client retries, or future bridges could enqueue the same event twice. The workflow currently **does not** dedupe by event id; each signal becomes one queue entry and one activity attempt.
3. **`suite_start` twice** — Playwright mitigates a second `suite_start` after worker recycle via a filesystem lock (`tryClaimSuiteStartEmit`); the workflow does not enforce “exactly once” for that signal.

**Downstream contract:** Dashing’s ingest should tolerate **at-least-once** delivery. Today’s SQLite helpers partially reflect that: `recordSuiteStart` and `recordTestCaseStart` use **`ON CONFLICT … DO NOTHING`**; `recordSuiteEnd` and `recordTestCaseEnd` **UPDATE** by id (re-applying the same end state is usually harmless). Stronger guarantees would add explicit **idempotency keys** or dedupe tables keyed by `(suiteUuid, testUuid, eventType, …)` if payloads can vary across retries.

## Task queue and env

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `TEMPORAL_ADDRESS` | `127.0.0.1:7233` | gRPC address for server (client + worker). |
| `TEMPORAL_NAMESPACE` | `default` | Temporal namespace (worker + client). Override for hosted clusters (e.g. Temporal Cloud). |
| `TEMPORAL_TASK_QUEUE` | `dashing-publish` | Worker poll queue (must match publisher). |
| `DASHING_API_URL` | `http://127.0.0.1:3000` | Base URL for activities (worker only). |
| `TEMPORAL_CONNECT_RETRIES` | `15` | Worker: gRPC connect attempts before exit (useful right after `temporal:up`; increase on slow hosts). |
| `TEMPORAL_CONNECT_RETRY_MS` | `2000` | Worker: delay between connect attempts (ms). |

## Local dev

1. **Temporal Server** — either:
   - **Docker:** `npm run temporal:up` (uses `docker-compose.temporal.yml`: Postgres + `temporalio/auto-setup` on port `7233`; `DB` must be a driver name such as **`postgres12`**, not `postgresql`), or
   - **CLI:** install the [Temporal CLI](https://docs.temporal.io/cli) and run `temporal server start-dev`.
2. **Dashing API** — `npm run dev` or `npm run start -w backend` so `POST /api/events` is available.
3. **Worker** — from repo root: `npm run temporal:dev` (runs `temporal-worker` with `tsx watch`), or `npm run build -w temporal-worker && node temporal-worker/dist/worker.js`.

Local stacks use the **`default`** Temporal namespace (no extra namespace registration).

To tear down Docker Temporal: `npm run temporal:down`.

## Playwright helper

- `tests/support/dashingTemporalPublisher.ts` — `DashingTemporalPublisher.connect({ suiteUuid })` then `emit(event)` for each event; first call uses **`signalWithStart`**, later calls **`signal`** on the same `workflowId`.
- Integration test: `tests/dashing-temporal.spec.ts` (skipped if Temporal is not reachable). Run: `npm run test:e2e:dashing` with server + worker + API up.

## Changing behavior

Workflow and activity code live under `temporal-worker/src/`. Any change to signal names, workflow id format, or retry policy should be updated here and in the Playwright helper if it affects the contract.
