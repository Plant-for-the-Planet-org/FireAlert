# AGENTS Instructions

## Workflow

## Plan Storage

Whenever you create a plan, store it as a Markdown file in the directory that matches your tool:

| Tool                 | Plans directory        |
| -------------------- | ---------------------- |
| Claude / Claude Code | `.claude/plans/`       |
| Codex                | `.codex/plans/`        |
| Windsurf             | `.windsurf/plans/`     |
| Cursor               | `.cursor/plans/`       |
| Copilot              | `.copilot/plans/`      |
| Any other agent      | `.<agent-name>/plans/` |

Use a descriptive filename in kebab-case, e.g. `example-implementation.plan.md`.

Plans should include:

- **Context** — why the change is needed
- **Approach** — what will be done and how
- **Files to modify** — exact paths
- **Verification** — how to test the result
