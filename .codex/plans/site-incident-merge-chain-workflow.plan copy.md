## Site Incident Merge-Chain Workflow Plan

### Summary

Implement merge-aware incident processing in `apps/server` so overlapping active incidents create a new child incident, future alerts attach to the correct terminal child, and related chains resolve together only when all linked active incidents are stale. Keep schema edits to Prisma schema only; no migration generation or Prisma type generation.

### Implementation Changes

- Update cron workflow in [site-incident-manager.ts](/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/src/pages/api/cron/site-incident-manager.ts) to `link alerts first -> resolve incidents second`, preserving batch/error handling but changing ordering and logs/metrics accordingly.
- Extend proximity matching in SiteIncident services to return all in-threshold matches (not just nearest), map each match to its terminal child in the active chain, then:
  - create a normal incident when zero terminal matches exist,
  - associate alert to that terminal child when exactly one exists,
  - create a new child incident when multiple distinct terminal children exist, then link each terminal parent to that child via `relatedIncidentId`.
- Ensure lineage-aware dedupe so parent+its-own-child overlap does not create unnecessary new children.
- Add one-way `STOP_ALERTS` propagation logic:
  - child inherits `STOP_ALERTS` at merge creation if any merged parent has it,
  - setting `STOP_ALERTS` on an incident cascades to descendants,
  - reverting to `TO_REVIEW` does not auto-unset descendants.
- Replace per-incident stale resolution with related-chain resolution:
  - build active related components transitively through `relatedIncidentId` (both directions),
  - resolve an entire component only if every active incident in that component is stale by cutoff,
  - skip entire component if any linked active incident is recent.

### Public Interfaces / Types / Schema

- In [schema.prisma](/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident-2/apps/server/prisma/schema.prisma), add `SiteIncident.relatedIncidentId` plus self-relation fields and index on `relatedIncidentId` (nullable FK with `onDelete: SetNull`).
- Update incident DTO/interfaces used by repository/service to include `relatedIncidentId` and optional create-time review status override for child creation.
- Extend proximity result/types to expose multi-match results needed for merge decisions.
- Keep existing API routes/signatures unchanged; behavior change is internal (notably review-status cascade side effect).

### Test Plan

- Manual scenario: single active incident in range -> alert associates, no child creation.
- Manual scenario: two unrelated active incidents both in range -> one child created, parents linked to child, alert linked to child.
- Manual scenario: parent and its own child both in range -> no new child, alert linked to terminal child.
- Manual scenario: mixed lineage overlap (existing child + another branch) -> new child created from distinct terminal branches.
- Manual scenario: parent `STOP_ALERTS` before merge -> child is created with `STOP_ALERTS`, no alert/incident notifications for child.
- Manual scenario: set `STOP_ALERTS` after chain exists -> descendants updated to `STOP_ALERTS`.
- Manual scenario: related chain with one recent linked incident -> none of that chain resolves.
- Manual scenario: related chain all stale -> entire active chain resolves in same run.
- Run lint/build checks after your manual migration + Prisma type generation steps.

### Assumptions & Defaults

- `relatedIncidentId` direction is **parent -> child** (supports many parents to one child).
- Resolution freshness continues using existing `updatedAt` semantics.
- Related linking is only between incidents of the same site (enforced in service logic).
- Schema edit only; migration creation, migration execution, and Prisma generate remain user-controlled.
