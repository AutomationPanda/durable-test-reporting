# Test result events and data model

This document is the **canonical definition** of how Dashing represents a single **test launch**: one **suite** containing one or more **test cases**, the **lifecycle events** publishers must emit, and what Dashing must do with them. Feature specs may add transport, APIs, and UI detail; they must **not** contradict this model without updating this file.

## Launch, suite, and test case

| Concept | Definition |
| --------|------------ |
| **Launch** | One execution of a test automation run that reports into Dashing. A launch is identified by exactly **one suite** for the purpose of this model. |
| **Suite** | The aggregate of all test cases executed together in that launch. A suite has **exactly one** suite-level start and **exactly one** suite-level end for its UUID over the launch. |
| **Test case** | A single test within the suite. Each test case belongs to **exactly one** suite (via `suiteUuid`). A test case has **at most one** start and **at most one** end per `testUuid` in that launch. |

## Identifiers

| Field | Applies to | Requirement |
| ----- | ----------- | ------------- |
| **Suite UUID** | Suite | **Required.** Universally unique identifier for the suite for this launch. Stable for the lifetime of that suite from `suite_start` through `suite_end` and for all child test events. String form (e.g. RFC 4122). |
| **Test UUID** | Test case | **Required.** Universally unique identifier for that test case within the launch. Stable from `test_case_start` through `test_case_end` for the same logical test. String form (e.g. RFC 4122). |

Implementations should treat UUIDs as opaque strings and preserve casing as received.

## Time fields

All **start** and **end** times are **instants** when the corresponding boundary occurred (wall-clock or runner-reported clock). Recommended interchange format: **ISO 8601** in UTC (e.g. `2026-05-04T12:00:00.000Z`). Exact wire format may be fixed in a feature spec or API contract.

## Test result (test case end)

For **`test_case_end`**, **`testResult`** is the final outcome of that test case:

| Value | Meaning |
| ----- | ------- |
| `pass` | Test completed successfully. |
| `fail` | Test completed with a failure. |

Extensions (e.g. `skipped`, `error`) require an update to this document or an explicit ADR plus alignment here.

## Events

Publishers emit the following **event types**. Each row is the **minimum** payload Dashing must accept and persist for that event.

### `suite_start`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `suiteUuid` | string (UUID) | yes | Suite identifier for this launch. |
| `suiteName` | string | yes | Human-readable suite name (e.g. job name, file, or session label). |
| `startTime` | instant | yes | When the suite run began. |

### `suite_end`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `suiteUuid` | string (UUID) | yes | Same suite as in `suite_start`. |
| `endTime` | instant | yes | When the suite run finished. |

### `test_case_start`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `testUuid` | string (UUID) | yes | Test case identifier. |
| `suiteUuid` | string (UUID) | yes | Parent suite; must match the launch’s suite. |
| `testName` | string | yes | Human-readable test name. |
| `startTime` | instant | yes | When this test case began. |

### `test_case_end`

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `testUuid` | string (UUID) | yes | Same test as in `test_case_start`. |
| `endTime` | instant | yes | When this test case finished. |
| `testResult` | enum | yes | `pass` or `fail` (see table above). |

## Ordering and consistency (normative expectations)

- **`suite_start`** should precede **`suite_end`** for the same `suiteUuid`.
- **`test_case_start`** for a `testUuid` should precede **`test_case_end`** for the same `testUuid`.
- Test events’ `suiteUuid` must equal the suite established by **`suite_start`** for that launch.
- Dashing may accept events slightly out of order (e.g. network reordering); persistence and UI should still converge on a consistent timeline using timestamps and UUIDs. Exact reconciliation rules may be refined in feature specs.

## Dashing responsibilities

1. **Receive** — Ingest the four event types (and their payloads) from publishers according to the delivery mechanism defined elsewhere (e.g. HTTP API, message bus, Temporal signals—**not** fixed in this document).
2. **Store** — Persist suites and test cases and all received fields in the **database** so history survives restarts and can be queried.
3. **Display in real time** — Update the **web frontend** as events arrive so operators see suite and test lifecycle and final **pass** / **fail** without waiting for the full run to finish.

Durability (e.g. Temporal-backed buffering) is a **product/engineering** commitment; this document defines **what** must survive and be shown, not **how** the pipe is implemented.

## Relationship to other specs

- **`specs/product/overview.md`** — Why we track suites and tests at a high level.
- **`specs/features/*.md`** — Concrete APIs, DB schema, UI components, and acceptance tests should trace back to the event types and fields defined here.
