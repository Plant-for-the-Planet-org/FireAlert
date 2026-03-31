# Mobile Home + Settings Refactor Plan (Feature Parity)

## Summary

- Refactor `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx` and `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/Settings.tsx` into smaller, cohesive files without changing behavior, visuals, copy, or navigation.
- Locked decisions from this planning session:

1. RTK scope: `Minimal RTK` (no broad state migration).
2. Style strategy: section-based style files with shared screen style tokens.
3. Dependency updates: patch/minor only.

- Plan artifact target path: `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/.codex/plans/mobile-home-settings-feature-parity-refactor-plan.md`.

## Public APIs / Interfaces / Types

1. Add typed selectors in Redux slices:

- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/redux/slices/login/loginSlice.ts`
- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/redux/slices/login/settingsSlice.ts`

2. Add typed screen-level interfaces for extracted components and handlers:

- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/types.ts`
- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/types.ts`

3. Add navigation typing surface for Home/Settings route params:

- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/types/navigation.ts`

4. No backend API contract changes and no tRPC query key changes.

## Implementation Plan

### 1. Baseline and Safety Snapshot

1. Capture baseline metrics and risk points (already identified: Home ~2006 LOC, Settings ~2227 LOC, heavy modal/map/mutation coupling).
2. Record all current interactions and expected outputs for parity validation.
3. Freeze user-facing copy and design tokens as parity guardrails.
4. Add a parity checklist file in the plan doc for implementation tracking.

### 2. Style Architecture Refactor (No Visual Change)

1. Extract Home styles into section files while preserving exact values:

- `/.../screens/Home/styles/sharedStyles.ts`
- `/.../screens/Home/styles/mapStyles.ts`
- `/.../screens/Home/styles/modalStyles.ts`
- `/.../screens/Home/styles/actionStyles.ts`

2. Extract Settings styles into section files while preserving exact values:

- `/.../screens/Settings/styles/sharedStyles.ts`
- `/.../screens/Settings/styles/sitesStyles.ts`
- `/.../screens/Settings/styles/notificationStyles.ts`
- `/.../screens/Settings/styles/modalStyles.ts`
- `/.../screens/Settings/styles/infoCardStyles.ts`

3. Move currently cross-file style coupling off `Settings.tsx`:

- Update `/.../screens/Settings/Badges.tsx` and `/.../screens/Settings/ProtectedSitesSettings.tsx` to import from `styles/sharedStyles.ts` instead of `Settings.tsx`.

4. Keep all existing spacing/color/typography numbers identical; only relocate definitions.

### 3. Home Screen Decomposition

1. Keep `/.../screens/Home/Home.tsx` as orchestration container only.
2. Extract map rendering concerns:

- `/.../screens/Home/components/HomeMapView.tsx`
- `/.../screens/Home/components/HomeMapSources.tsx`

3. Extract floating controls and overlays:

- `/.../screens/Home/components/HomeFloatingActions.tsx`
- `/.../screens/Home/components/IncidentDebugOverlay.tsx`

4. Extract modal/bottom-sheet blocks:

- `/.../screens/Home/components/ProfileSheet.tsx`
- `/.../screens/Home/components/AlertDetailsSheet.tsx`
- `/.../screens/Home/components/SiteDetailsSheet.tsx`
- `/.../screens/Home/components/EditProfileModal.tsx`
- `/.../screens/Home/components/EditSiteModal.tsx`
- `/.../screens/Home/components/PermissionModals.tsx`

5. Extract side-effect logic into hooks:

- `/.../screens/Home/hooks/useHomeLocation.ts`
- `/.../screens/Home/hooks/useHomeSiteActions.ts`
- `/.../screens/Home/hooks/useHomeIncidentCircle.ts`
- `/.../screens/Home/hooks/useHomeMapSelection.ts`

6. Keep current behavior for map camera moves, permission alerts, profile/account actions, incident circle rendering, and all navigation/deletion/update flows.

### 4. Settings Screen Decomposition

1. Keep `/.../screens/Settings/Settings.tsx` as orchestration container only.
2. Extract major sections:

- `/.../screens/Settings/components/ProjectsSection.tsx`
- `/.../screens/Settings/components/MySitesSection.tsx`
- `/.../screens/Settings/components/NotificationsSection.tsx`
- `/.../screens/Settings/components/WarningSections.tsx`
- `/.../screens/Settings/components/SatelliteInfoSection.tsx`

3. Extract repeated row patterns:

- `/.../screens/Settings/components/NotificationMethodRows.tsx`
- `/.../screens/Settings/components/SiteRow.tsx`

4. Extract modal/overlay UI:

- `/.../screens/Settings/components/SiteInfoSheet.tsx`
- `/.../screens/Settings/components/EditSiteModal.tsx`
- `/.../screens/Settings/components/RadiusDropdownOverlay.tsx`

5. Move query/mutation orchestration into hooks:

- `/.../screens/Settings/hooks/useSettingsData.ts`
- `/.../screens/Settings/hooks/useSettingsActions.ts`
- `/.../screens/Settings/hooks/useAlertPreferencesVM.ts`

6. Keep exact behavior for site radius updates, site toggle/delete, notification enable/disable, verification flows, and deep-link style navigation to Home map.

### 5. Minimal RTK Improvements

1. Replace raw `useSelector` in Settings with typed hooks:

- `/.../app/hooks/redux/reduxHooks.ts` usage normalization.

2. Add and consume memo-friendly selectors:

- `selectAlertMethods`, `selectUserDetails`, `selectConfigData`.

3. Do not migrate large local UI state into Redux in this refactor.
4. Keep BottomBarContext and MapLayerContext unchanged for risk containment.

### 6. Dependency Update Gate (Patch/Minor Only)

1. Check available patch/minor updates for `@reduxjs/toolkit` and `react-redux`.
2. Upgrade only if both remain compatible with current React Native stack and no behavior drift is observed.
3. If any regression appears, skip upgrade and keep current locked versions.
4. Expected touched files only if update proceeds:

- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/package.json`
- `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/yarn.lock`

### 7. Verification and Regression Control

1. Static checks:

- `yarn workspace @firealert/nativeapp lint`
- `yarn workspace @firealert/nativeapp test`
- `yarn workspace @firealert/nativeapp tsc --noEmit` (if available in workspace scripts/tooling)

2. Ensure extracted containers remain behavior-only wrappers and keep route params/callback signatures unchanged.
3. Confirm no change to existing constants, copy strings, color/typography tokens, or spacing values.
4. Confirm `Home.tsx` and `Settings.tsx` are reduced to orchestration components with clear boundaries.

## Impact Footprint

### Primary Files to Modify

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx`
2. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/Settings.tsx`
3. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/Badges.tsx`
4. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/ProtectedSitesSettings.tsx`
5. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/redux/slices/login/loginSlice.ts`
6. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/redux/slices/login/settingsSlice.ts`

### New Files Expected

1. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/components/*`
2. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/hooks/*`
3. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/styles/*`
4. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/components/*`
5. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/hooks/*`
6. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/styles/*`
7. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/types/navigation.ts`
8. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/types.ts`
9. `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/types.ts`

## Test Cases and Scenarios (Your Manual QA List)

1. Home map opens with same default layer and camera behavior.
2. Home receives `bboxGeo/siteInfo` navigation params and highlights target site exactly as before.
3. Tapping alert marker opens same alert sheet content and map recenter behavior.
4. Incident summary card appears for alerts with `siteIncidentId`.
5. Incident circle appears with same color logic (`active` vs `resolved`).
6. My-location button behavior is unchanged when permission is granted.
7. Permission denied flow shows same denied alert and retry actions.
8. Permission blocked flow shows same blocked alert and app-exit behavior.
9. Layer button opens/closes layer modal exactly as before.
10. Profile avatar button opens profile sheet and displays same user data.
11. Edit profile name modal saves and refreshes profile data correctly.
12. Logout clears session and returns to sign-in flow.
13. Delete account flow still shows confirmation modal and performs soft-delete/logout.
14. Site details sheet opens for polygon, multipolygon, and point sites.
15. Enable/disable monitoring toggle works for normal sites and protected sites.
16. Delete site works for eligible sites and stays disabled for project-synced sites.
17. Edit site modal enforces minimum 5-char name and radius update behavior.
18. “Open in Google Maps” from alert sheet opens correct coordinates.
19. Settings pull-to-refresh updates sites and alert preferences with same loading UX.
20. My Projects list renders same project/site grouping and controls.
21. My Sites list renders same controls and empty state with Add Site button.
22. Protected Areas section still works (toggle, open details, delete protected area).
23. Radius dropdown overlay opens in same location and applies selected radius.
24. Notification cards render for Mobile, Email, SMS, Webhook with same enable/disable logic.
25. Verify flow for unverified alert methods still navigates to Otp with correct payload.
26. Add Email/SMS/Webhook navigation to Verification screen remains unchanged.
27. Remove alert method shows same loader and removal behavior.
28. Warning/info blocks render with identical copy and visual style.
29. Footer links (Imprint, Privacy, Terms, NASA/FIRMS links) navigate correctly.
30. Bottom tab navigation between Explore and Settings remains unchanged.

## Assumptions and Defaults

1. Feature parity is strict: no intentional behavior/UI/copy changes.
2. Existing debug-oriented Home incident overlay behavior is preserved unless explicitly approved otherwise.
3. No backend schema/API/router changes.
4. No migration of BottomBarContext or MapLayerContext in this scope.
5. RTK upgrades are optional and only applied if patch/minor-safe.
6. Existing tRPC query keys and cache update semantics remain unchanged.
