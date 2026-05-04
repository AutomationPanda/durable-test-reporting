# Product — Dashing

## Name

The product is named **Dashing**.

## Problem

Test runs produce results over time. Teams need a **live** view of which tests have started, finished, and whether they **passed** or **failed**, without waiting for a final report file.

## Solution direction

- **Web dashboard** as the primary UI.
- Tests **publish** results to the dashboard’s service **as they run** (e.g., via hooks or similar integration points).
- Publishing is **durable**: use **Temporal** workflows and activities so that if the dashboard or network is temporarily unavailable, **results are not lost** and can be delivered when the system recovers.

Each **launch** is modeled as one **suite** (with its own UUID) containing **one or more test cases** (each with its own UUID). Publishers emit **suite** and **test case** start/end events; field-level definitions and Dashing’s obligations to receive, store, and show them live are specified in **`specs/engineering/test-result-events.md`**.

## Success themes

- **Observability**: Operators and developers can see live progress.
- **Reliability**: Result delivery survives transient failures (durable path).
- **Clarity**: Final per-test outcome is visible (Pass/Fail) when a test ends.

## Out of scope (until a feature spec says otherwise)

Specific UI layout, auth model, multi-tenancy, and exact hook API shapes belong in **feature specs** or **engineering** ADRs, not here.
