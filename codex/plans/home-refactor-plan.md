# Implementation Plan: Home.tsx Container Refactoring

## Overview

Refactor Home.tsx (~1860 LOC) into a lean orchestration container (<500 LOC) by moving all business logic to existing hooks and components.

## Current State Analysis

### Existing Infrastructure (Already Created)

- **Hooks**: useHomeLocation, useHomeSiteActions, useHomeIncidentCircle, useHomeMapSelection
- **Components**: HomeMapView, HomeMapSources, HomeFloatingActions, ProfileSheet, AlertDetailsSheet, SiteDetailsSheet, EditSiteModal, EditProfileModal, PermissionModals, IncidentDebugOverlay
- **Types**: Home/types.ts with all interfaces defined
- **Styles**: Home/styles/ directory with organized style files

### Current Home.tsx Structure

The file contains:

1. **State Management** (~30 useState calls)

   - Location, permissions, modals, selections, site editing
   - Alert and incident data
   - Loading states

2. **Business Logic** (~800 LOC)

   - tRPC mutations (updateUser, updateSite, deleteSite, deleteProtectedSite, pauseAlertForProtectedSite, softDeleteUser)
   - Location permission handling (checkPermission, updateCurrentPosition)
   - Site operations (handleEditSite, handleEditSiteInfo, handleUpdateMonitoringSite, handleDeleteSite)
   - User operations (handleLogout, handleDeleteAccount)
   - Map interactions (onPressMyLocationIcon, handleMyLocation, handleLayer)
   - Render functions (renderAnnotation, renderSelectedPoint, renderMapSource, etc.)

3. **Effects** (~15 useEffect hooks)

   - Route parameter handling
   - Location updates
   - Incident circle calculation
   - Camera positioning

4. **UI Rendering** (~200 LOC)
   - Map with sources and layers
   - Floating action buttons
   - Modals and sheets
   - Debug overlay

## Refactoring Strategy

### Phase 1: Consolidate State into Hooks

Move all state management to existing hooks:

- **useHomeLocation**: location, permissions (isPermissionDenied, isPermissionBlocked)
- **useHomeSiteActions**: site mutations (updateSite, deleteSite, deleteProtectedSite, pauseAlertForProtectedSite)
- **useHomeIncidentCircle**: incident data and circle generation
- **useHomeMapSelection**: selected site, alert, area

### Phase 2: Extract Remaining Business Logic

Move remaining logic to hooks or utilities:

- User mutations (updateUser, softDeleteUser) → new hook or keep in container with minimal state
- Location operations (checkPermission, updateCurrentPosition, handleMyLocation) → useHomeLocation
- Site operations (handleEditSite, handleEditSiteInfo, etc.) → useHomeSiteActions
- Map interactions (handleLayer, handleLogout, handleDeleteAccount) → keep in container as event handlers

### Phase 3: Simplify State Management

Keep only UI-state in container:

- Modal visibility (profileModalVisible, siteNameModalVisible, profileEditModal, showDelAccount)
- Form inputs (profileName, siteName, siteRad, siteId, siteGeometry, isEditSite)
- Map refs (map, camera)
- Toast ref (modalToast)

### Phase 4: Refactor Render Functions

Move render functions to components:

- renderAnnotation, renderSelectedPoint, renderAnnotations → HomeMapSources component
- renderHighlightedMapSource, renderMapSource, renderProtectedAreasSource → HomeMapSources component
- renderIncidentCircle → IncidentDebugOverlay or HomeMapSources

### Phase 5: Compose Container

Final Home.tsx will:

1. Initialize all hooks
2. Manage modal visibility state
3. Handle form inputs for editing
4. Compose components with props
5. Handle navigation

## Implementation Steps

### Step 1: Review Existing Hooks

- Verify useHomeLocation handles all permission logic
- Verify useHomeSiteActions handles all site mutations
- Verify useHomeIncidentCircle handles incident data
- Verify useHomeMapSelection handles selection state

### Step 2: Update Hooks if Needed

- Add missing functionality to hooks
- Ensure hooks return all needed handlers and state

### Step 3: Refactor Home.tsx

1. Remove all business logic state
2. Replace with hook calls
3. Remove render functions (move to components)
4. Remove mutation handlers (move to hooks)
5. Keep only UI orchestration

### Step 4: Verify Component Props

- Ensure all components receive needed props
- Ensure all callbacks are properly wired

### Step 5: Test

- TypeScript compilation
- No visual changes
- No behavioral changes
- File size < 500 LOC

## Expected Outcome

### Before

- Home.tsx: ~1860 LOC
- Multiple state variables
- Complex business logic mixed with UI
- Difficult to test and maintain

### After

- Home.tsx: <500 LOC
- Clean orchestration only
- All business logic in hooks
- Easy to test and maintain
- Same visual and behavioral output

## Key Considerations

1. **Preserve Behavior**: No changes to user-facing functionality
2. **Preserve Visuals**: No changes to styling or layout
3. **Type Safety**: Maintain strict TypeScript types
4. **Performance**: Use memoization where needed
5. **Navigation**: Keep route parameter handling intact
6. **Context Usage**: Keep BottomBarContext and MapLayerContext usage

## Risks & Mitigations

| Risk                            | Mitigation                                     |
| ------------------------------- | ---------------------------------------------- |
| Breaking existing functionality | Run full manual QA after refactoring           |
| Type errors                     | Use getDiagnostics tool to verify              |
| Performance regression          | Profile before/after with React DevTools       |
| Incomplete hook implementation  | Review each hook thoroughly before refactoring |

## Success Criteria

- [ ] Home.tsx is less than 500 lines
- [ ] TypeScript compiles without errors
- [ ] No visual changes (screenshot comparison)
- [ ] No behavioral changes (manual QA passes)
- [ ] All hooks are properly utilized
- [ ] All components are properly composed
