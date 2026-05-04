# HTTP API (MVP ingest and read)

This document describes the **current** HTTP surface for Dashing. It complements [`test-result-events.md`](test-result-events.md) (event payloads). Transport details may evolve in feature specs or ADRs; update this file when routes or contracts change.

## `GET /api/suites`

Returns persisted suite runs for the dashboard.

**Response** `200` — JSON object:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `suites` | array | Suite runs sorted by `startTime` descending (newest first). |

Each element:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `suiteUuid` | string | Suite identifier. |
| `suiteName` | string | Human-readable name from `suite_start`. |
| `startTime` | string | ISO 8601 instant when the suite started. |
| `endTime` | string \| null | ISO 8601 instant when the suite ended, or `null` if still in progress. |

## `POST /api/events`

Ingests a single event. Body must be a JSON object with a `type` field.

### `suite_start`

| Field | Type | Required |
| ----- | ---- | -------- |
| `type` | literal `"suite_start"` | yes |
| `suiteUuid` | string | yes |
| `suiteName` | string | yes |
| `startTime` | string (ISO 8601 recommended) | yes |

**Response** `204` on success. Duplicate `suiteUuid` (second `suite_start`) is ignored.

### `suite_end`

| Field | Type | Required |
| ----- | ---- | -------- |
| `type` | literal `"suite_end"` | yes |
| `suiteUuid` | string | yes |
| `endTime` | string (ISO 8601 recommended) | yes |

**Response** `204` on success.

**Errors** — `400` JSON `{ "error": string }` for invalid body, missing fields, or unsupported `type`.
