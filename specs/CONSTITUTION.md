# Project constitution — spec-driven development

This document is the **binding agreement** for how **Dashing** (durable live test reporting) is developed in this repository. All contributors and automation (including AI assistants) must follow it.

## 1. Purpose

We build **Dashing**: a web dashboard that shows live test execution (start, end, Pass/Fail), fed by automated tests publishing results in real time, with **durable** delivery via **Temporal** workflows and activities so outages do not lose results.

Development is **spec-driven**: behavior is agreed in Markdown **before** implementation, and code is expected to **satisfy** those specs.

## 2. Hierarchy of truth

When documents conflict, resolve in this order (highest wins):

1. **This constitution** — process and non-negotiable principles.
2. **Product and engineering documents** under `specs/product/` and `specs/engineering/` — stable product intent and technical choices.
3. **Feature specifications** under `specs/features/*.md` — implementable units of work.
4. **Code** — must reflect the above; if code and specs disagree, either fix the code or **explicitly** update the specs first (never silently drift).

The **brain dump** (`specs/product/brain-dump.md`) is historical input only; authoritative intent lives in **product**, **engineering**, and **feature** files once they exist.

## 3. Roles


| Role                            | Responsibility                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Humans**                      | Maintain constitution and product/engineering docs when direction changes; author feature specs (user story, narrative, acceptance criteria); prioritize and accept work. |
| **Implementers (including AI)** | Read the relevant feature spec and product/engineering docs before coding; implement to meet acceptance criteria; flag gaps or contradictions instead of guessing.        |


## 4. Feature specification workflow

1. **Author** — A human adds or updates `specs/features/<feature-slug>.md` using the template in that folder. Each file describes **one** coherent feature (or one vertical slice).
2. **Review** — Acceptance criteria are **testable** and **unambiguous** where possible. Open questions are either resolved in the spec or called out in a short “Open questions” section.
3. **Implement** — Work is directed at a **specific** feature file. Implementation must trace to that file’s user story and criteria.
4. **Verify** — “Done” means the acceptance criteria are met (or the spec was amended with rationale). Update product or engineering docs if new durable facts emerge (e.g., API contracts, event names).

## 5. What belongs where


| Location                | Content                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `specs/CONSTITUTION.md` | This file: process, hierarchy, workflow.                                                                  |
| `specs/product/`        | Product vision, goals, scope boundaries, archival brain dump (`brain-dump.md`).                           |
| `specs/engineering/`    | Tech stack, integration assumptions, optional ADRs (Markdown files in this directory).                    |
| `specs/features/`       | Per-feature Markdown: user story, description, acceptance criteria (and optional diagrams, API sketches). |


## 6. Changing the rules

- **Constitution** changes require explicit human decision (small teams: any maintainer; document the change in git history).
- **Product** and **engineering** docs change when product name, stack, durability model, or cross-cutting constraints change.
- **Feature specs** change per feature; supersede prior text in the same file for that feature.

## 7. Implementation principles (non-code)

- Prefer **small, reviewable** changes tied to a named feature spec.
- **Temporal** and **durable** publishing are first-class constraints unless a feature spec explicitly defers them with a stated phase.
- Stack alignment: full-stack **TypeScript**; **React** + **Tailwind** on the frontend; **Express** and **SQLite** on the backend, unless engineering documents record an approved deviation.

## 8. Definition of done (spec-driven)

A feature is complete when:

1. The governing `specs/features/<slug>.md` acceptance criteria are satisfied (or intentionally updated with reason).
2. No unresolved contradiction remains between that spec and authoritative docs under `specs/product/` and `specs/engineering/`.
3. The constitution’s hierarchy is respected.

---

*Version: initial. Amend via git with a clear commit message.*