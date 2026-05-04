# Feature specifications

Each **Markdown file** in this directory describes **one feature** (or one vertical slice) to implement in Dashing.

## Authoring workflow

1. Copy [`_template.md`](_template.md) to `<feature-slug>.md` (use `kebab-case` slugs).
2. Fill in **user story**, **description**, and **acceptance criteria**. Criteria should be verifiable.
3. Optionally add diagrams, API sketches, or an “Open questions” section.
4. Direct implementation work at that file by name (for humans and AI).

## Relationship to other specs

- Obey **`specs/CONSTITUTION.md`** for process.
- Stay consistent with **`specs/product/`** and **`specs/engineering/`**; if a feature requires changing them (e.g., stack), update those docs in the same effort or note the dependency.

## Naming

- One primary user story per file is recommended.
- Split large epics into multiple files with clear dependencies called out in the description.
