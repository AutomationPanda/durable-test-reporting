# Engineering

This directory holds **stable technical intent**: stack, architecture notes, and optional decision records. It is **not** a backlog; use `specs/features/` for implementable specs.

## Contents

| Path | Role |
|------|------|
| [tech-stack.md](tech-stack.md) | Approved stack and layers. |
| [test-result-events.md](test-result-events.md) | Suite / test case model, event payloads, and Dashing ingest–store–display obligations. |
| [http-api.md](http-api.md) | Current HTTP routes for ingesting events and reading suite runs. |

Optional **architecture decision records (ADRs)** live in this directory as Markdown files (for example `0001-short-title.md`). Each ADR should cover situational context, decision, consequences, and links to feature specs or code.

When engineering direction changes, update these files in the same change as the discussion (or immediately after), so implementers always read current truth.
