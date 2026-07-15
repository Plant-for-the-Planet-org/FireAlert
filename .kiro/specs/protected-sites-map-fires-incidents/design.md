# Design Document

## Overview

The map already has every rendering and interaction piece this feature needs. The only real gap is the read path: `alert.getAlerts` filters on `site.userId`, and Protected Sites have `userId = null` (ownership lives in `SiteRelation`). We add one new tRPC query for Protected Site alerts and merge its result into the alert list the map already consumes. Everything downstream (date filter, incident composition, bottom sheets, view switch) works unchanged because it operates on that list.

## Current data flow (unchanged pieces)

```
alert.getAlerts ──► useFetchSites ──► alerts
                                        │
                    mapDurationDays ──► filteredAlerts (client-side date filter)
                                        │
              ┌─────────────────────────┴──────────────────────┐
   alerts mode: renderAnnotations(true)              incidents mode: composedIncidents
   fire icons (PointAnnotation + getFireIcon)        group by siteIncidentId, cap 60,
   tap → openAlertDetails                            generateIncidentCircle
                                                     tap → handleIncidentTap → openIncidentDetails
```

- `AlertDetailsBottomSheet` fetches via `alert.getAlert` (publicProcedure, no ownership check) — already works for Protected Site alerts.
- `IncidentDetailsBottomSheet` fetches via `siteIncident.getIncident`; its `checkUserHasSitePermission` only rejects when `site.userId` is set and mismatched, so `userId = null` Protected Sites pass — already works.
- The "further" navigation (incident detection → alert details → back) is Redux state in `detailsUISlice` and does not care where the alert came from.

## Backend change

### New query: `alert.getAlertsForProtectedSites`

File: `apps/server/src/server/api/routers/alert.ts`

A copy of `getAlerts` with one difference in the `site.findMany` where clause:

```ts
// getAlerts:
where: { userId: userId, deletedAt: null, alerts: { some: {...} } }

// getAlertsForProtectedSites:
where: {
  userId: null,
  deletedAt: null,
  siteRelations: { some: { userId: userId, deletedAt: null } },
  alerts: { some: { eventDate: { gte: thirtyDaysAgo }, deletedAt: null } },
}
```

Everything else identical: same select (including `site {id, name, project}` and `siteIncidentId`), same flatten, same sort, same 300 cap, same `getLocalTime` enrichment, same `{status: 'success', data}` envelope, same error handling.

Notes:
- `userId: null` guarantees no alert can appear in both endpoints, so the client merge needs no dedupe.
- No input schema needed (no input), matching `getAlerts`.
- `SiteRelation.isActive` is deliberately not filtered (decision: pause affects notifications only).

## Frontend changes

### 1. New hook: `useFetchProtectedSiteAlerts`

File: `apps/nativeapp/app/utils/api.tsx`

Mirror `useFetchSites`:

```ts
export const useFetchProtectedSiteAlerts = ({enabled, ...props}: UseQueryOptions) => {
  const toast = useToast();
  return trpc.alert.getAlertsForProtectedSites.useQuery(
    ['alerts', 'getAlertsForProtectedSites'],
    {
      enabled,
      retryDelay: 3000,
      onError: () => {
        toast.show('Something went wrong', {type: 'danger'});
      },
      ...props,
    },
  );
};
```

### 2. Merge in `Home.tsx`

File: `apps/nativeapp/app/screens/Home/Home.tsx`

- Call the new hook next to `useFetchSites` (Home.tsx:260):

```ts
const {data: protectedSiteAlerts} = useFetchProtectedSiteAlerts({enabled: true});
```

- Extend the `filteredAlerts` memo (Home.tsx:294-300) to filter the concatenation of both sources:

```ts
const filteredAlerts = useMemo(() => {
  const own = alerts?.json?.data ?? [];
  const protectedArea = protectedSiteAlerts?.json?.data ?? [];
  const all = own.concat(protectedArea);
  if (all.length === 0) return [];
  const cutoffDate = moment().subtract(mapDurationDays, 'days');
  return all.filter(alert => moment(alert.eventDate).isAfter(cutoffDate));
}, [alerts, protectedSiteAlerts, mapDurationDays]);
```

That is the entire frontend change. `renderAnnotations(true)` (fire icons, alerts mode), `composedIncidents` (incidents mode, 60 cap), `handleIncidentTap`, both bottom sheets, and the date filter all consume `filteredAlerts` and require no edits.

## Why this respects the constraints

- **No schema changes**: only a new resolver and a client merge.
- **No breaking changes**: `getAlerts` untouched; older app versions never call the new endpoint; response shapes identical so every consumer of `filteredAlerts` sees the same alert object shape.
- **Date filter**: applied client-side to the merged list, so both site types update instantly and identically.
- **View switch**: `mapDisplayMode` guards are downstream of the merge and unchanged.
- **Scope (map only)**: no other screen uses the new hook; `getAlerts` consumers elsewhere are unaffected.
- **Independent failure**: if the new query errors, `filteredAlerts` still contains normal site alerts.

## Pre-launch verification (done)

Confirmed that Protected Sites in the database have `detectionGeometry` populated (PostGIS trigger in `docs/create-postgis-triggers.sql`) and existing SiteAlert / SiteIncident rows. If an environment ever misses this, the backfill is `UPDATE "Site" SET "geometry" = "geometry" WHERE "origin" = 'protectedarea';` to re-fire the trigger — a data fix, not a schema change.

## Performance considerations

- Worst case the map now holds up to 600 alerts (300 + 300) as `PointAnnotation`s. This matches the existing worst-case pattern; the incident view already caps at 60 circles. No new optimization needed for this feature.
- The new query reuses the existing `SiteAlert` indexes; the `siteRelations` lookup uses the `SiteRelation` FK indexes.
