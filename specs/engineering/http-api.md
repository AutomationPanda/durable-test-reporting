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
| `passRatePercent` | number \| null | Rounded percentage of **passed** tests among **completed** tests (those with an end time); `null` when there are no completed tests. |

## `GET /api/suites/:suiteUuid/tests`

Returns one suite and its test cases for the suite test dashboard.

**Response** `200` — JSON object:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `suite` | object | Same shape as a `suites` array element. |
| `tests` | array | Test cases for that suite, sorted by `startTime` ascending (oldest first). |

Each element of `tests`:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `testUuid` | string | Test case identifier. |
| `suiteUuid` | string | Parent suite. |
| `testName` | string | Human-readable name from `test_case_start`. |
| `startTime` | string | ISO 8601 instant when the test started. |
| `endTime` | string \| null | ISO 8601 when the test ended, or `null` if still running. |
| `testResult` | `"pass"` \| `"fail"` \| null | Final outcome from `test_case_end`, or `null` until finished. |

**Response** `404` — JSON `{ "error": "Suite not found" }` if `suiteUuid` is unknown.

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

### `test_case_start`

| Field | Type | Required |
| ----- | ---- | -------- |
| `type` | literal `"test_case_start"` | yes |
| `testUuid` | string | yes |
| `suiteUuid` | string | yes |
| `testName` | string | yes |
| `startTime` | string (ISO 8601 recommended) | yes |

**Response** `204` on success. Duplicate `testUuid` (second `test_case_start`) is ignored.

### `test_case_end`

| Field | Type | Required |
| ----- | ---- | -------- |
| `type` | literal `"test_case_end"` | yes |
| `testUuid` | string | yes |
| `endTime` | string (ISO 8601 recommended) | yes |
| `testResult` | `"pass"` or `"fail"` | yes |

**Response** `204` on success.

**Errors** — `400` JSON `{ "error": string }` for invalid body, missing fields, or unsupported `type`.

## Local demo data

`npm run seed` at the repo root inserts deterministic dummy suites and test cases (see backend `seedDummySuites` / `seedDummyTestCases`). Safe to re-run; existing UUIDs are skipped.
