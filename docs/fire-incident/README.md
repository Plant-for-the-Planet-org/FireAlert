# Fire Incident Documentation (Implementation-First)

This documentation is optimized for development context reuse, especially for AI-assisted coding.

## Document Set
- `docs/fire-incident/implementation-reference.md`
  - Primary source of truth for current implementation.
  - Grouped by server domain, CRON, notifications, API, web UI, and mobile integration.
  - Includes Mermaid diagrams for architecture and runtime flows.

- `docs/fire-incident/spec-summary.md`
  - Short synthesis of intent from `.kiro/specs/fire-incident*`.
  - Kept intentionally compact.

- `docs/fire-incident/spec-vs-implementation-gaps.md`
  - Dedicated gap analysis between intended design and current runtime behavior.

## Recommended Usage for Future Work
1. Start with `implementation-reference.md`.
2. Use `spec-vs-implementation-gaps.md` to choose refactor priorities.
3. Use `spec-summary.md` only when product/behavior intent is needed.
