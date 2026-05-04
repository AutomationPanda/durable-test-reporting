# Engineering — stack

Approved default stack for Dashing (full-stack **TypeScript**). Deviations require an update to this file or an ADR as a Markdown file under `specs/engineering/` (see `README.md` there).

| Layer    | Choice   | Notes                          |
| -------- | -------- | ------------------------------ |
| Frontend | React    | UI components                  |
| Styling  | Tailwind | CSS framework                  |
| Backend  | Express  | API and server                 |
| Database | SQLite   | Persistence                    |

## Cross-cutting

- **Temporal** is the intended mechanism for durable workflows and activities around result publishing.
- Integration details (SDKs, worker placement, namespaces) should be captured in feature specs or ADRs as they are chosen.
