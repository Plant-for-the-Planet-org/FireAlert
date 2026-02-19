# Implementation Plan: Mobile Incident Display Enhancement

## Overview

This implementation plan breaks down the Mobile Incident Display Enhancement feature into manageable tasks following SOLID principles and existing mobile app patterns. The tasks are organized into phases that build incrementally.

---

# PHASE 1: CORE INFRASTRUCTURE (Requirements 1, 4, 5)

## Phase 1.1: Type Definitions & Interfaces

- [x] 1.1 Create TypeScript interfaces for incident data

  - Create `apps/nativeapp/app/types/incident.ts`
  - Define `IncidentData` interface matching API response
  - Define `SiteAlertData` interface for alert data
  - Define `FirePoint` interface for coordinate pairs
  - Define `IncidentCircleResult` interface for circle geometry
  - Export all interfaces for use across the app
  - _Requirements: 4.1, 4.6, 5.5_

## Phase 1.2: Utility Functions

- [x] 1.2 Implement incident circle calculation utilities

  - Create `apps/nativeapp/app/utils/incident/incidentCircleUtils.ts`
  - Implement `generateIncidentCircle(fires, paddingKm)` function
  - Implement `calculateIncidentArea(fires, paddingKm)` function
  - Use `@turf/turf` for geospatial calculations (point, center, circle, distance, area)
  - Add input validation and error handling
  - Add JSDoc comments for all functions
  - _Requirements: 2.1, 4.2, 4.5, 5.1_

- [ ]\* 1.3 Write unit tests for incident circle utilities

  - Create `apps/nativeapp/__tests__/utils/incident/incidentCircleUtils.test.ts`
  - Test circle calculation for single fire point
  - Test circle calculation for multiple fire points
  - Test handling of empty array
  - Test handling of invalid coordinates
  - Test padding application
  - Test area calculation accuracy
  - _Requirements: 2.1, 4.2_

## Phase 1.3: Custom Hook for Data Fetching

- [x] 1.4 Implement useIncidentData custom hook

  - Create `apps/nativeapp/app/hooks/incident/useIncidentData.ts`
  - Use tRPC's `siteIncident.getIncidentPublic.useQuery`
  - Accept `incidentId` and `enabled` parameters
  - Return `incident`, `isLoading`, `isError`, `error`
  - Implement proper cleanup on unmount
  - Add error handling with console logging (no toast)
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.6, 5.4_

- [ ]\* 1.5 Write unit tests for useIncidentData hook

  - Create `apps/nativeapp/__tests__/hooks/incident/useIncidentData.test.ts`
  - Test successful incident fetch
  - Test fetch error handling
  - Test skip fetch when incidentId is null
  - Test skip fetch when enabled is false
  - Test cleanup on unmount
  - _Requirements: 1.1, 1.2, 1.3, 4.1_

## Phase 1.4: Color Constants

- [x] 1.6 Add incident color constants

  - Update `apps/nativeapp/app/styles/Colors.ts`
  - Add `FIRE_ORANGE = '#E86F56'`
  - Add `FIRE_BROWN = '#B47C55'`
  - Add `FIRE_GRAY = '#C6C3C2'`
  - Add `INCIDENT_ACTIVE_COLOR = '#E86F56'`
  - Add `INCIDENT_RESOLVED_COLOR = '#6b7280'`
  - Export all new constants
  - _Requirements: 2.3, 2.4, 3.3, 3.4, 4.7_

- [x] 1.7 Checkpoint - Verify Phase 1 infrastructure
  - Run all unit tests: `yarn nativeapp test`
  - Verify TypeScript compilation: `yarn nativeapp tsc --noEmit`
  - Verify no new dependencies added
  - Ask the user if questions arise

---

# PHASE 2: UI COMPONENTS (Requirement 3)

## Phase 2.1: Incident Summary Card Component

- [x] 2.1 Create IncidentSummaryCard component structure

  - Create `apps/nativeapp/app/components/Incident/IncidentSummaryCard.tsx`
  - Define component props interface (`IncidentSummaryCardProps`)
  - Create basic component structure with View container
  - Add StyleSheet for component styles
  - Import required dependencies (React Native components, Colors, Typography)
  - _Requirements: 3.1, 3.2, 4.3, 4.4, 4.7_

- [x] 2.2 Implement card header section

  - Add header View with icon and title
  - Add "Fire Incident Summary" text
  - Add status badge (Active/Resolved) with conditional styling
  - Use `isActive` prop to determine badge color and text
  - Apply background color based on `isActive` (orange @ 25% or gray @ 25%)
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 2.3 Implement timeline section

  - Add "Started at" section with date and time
  - Add "Latest at" (active) or "Ended at" (resolved) section
  - Use `moment-timezone` for date formatting ("DD MMM YYYY")
  - Use `moment-timezone` for time formatting ("HH:mm AM/PM")
  - Add calendar and clock icons
  - _Requirements: 3.5, 3.7, 3.8, 5.3_

- [x] 2.4 Implement statistics section

  - Add "Total Fires" card with fire icon and count
  - Add "Area Affected" card with area icon and km² value
  - Use `calculateIncidentArea` utility for area calculation
  - Format area to 2 decimal places
  - Apply responsive flexbox layout
  - _Requirements: 3.6, 5.1_

- [x] 2.5 Add component styling

  - Apply border radius (12px)
  - Apply padding (16px)
  - Add background color with opacity
  - Style status badge
  - Style timeline section
  - Style statistics cards
  - Ensure responsive layout
  - _Requirements: 3.3, 3.4, 4.7_

- [ ]\* 2.6 Write unit tests for IncidentSummaryCard

  - Create `apps/nativeapp/__tests__/components/Incident/IncidentSummaryCard.test.tsx`
  - Test rendering with active incident
  - Test rendering with resolved incident
  - Test date formatting
  - Test area calculation
  - Test fire count display
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 2.7 Checkpoint - Verify Phase 2 components
  - Run component tests: `yarn nativeapp test`
  - Verify component renders correctly in isolation
  - Verify styling matches design
  - Ask the user if questions arise

---

# PHASE 3: MAP INTEGRATION (Requirements 2, 6)

## Phase 3.1: Incident Circle Rendering

- [x] 3.1 Create incident circle rendering function

  - Add `renderIncidentCircle()` function to `Home.tsx`
  - Accept incident circle data and isActive status
  - Return MapboxGL.ShapeSource with circle polygon
  - Add MapboxGL.FillLayer with appropriate color and opacity
  - Add MapboxGL.LineLayer with appropriate color and opacity
  - Use conditional color based on `isActive` (orange or gray)
  - _Requirements: 2.2, 2.3, 2.4, 5.2_

- [x] 3.2 Integrate useIncidentData hook into Home screen

  - Import `useIncidentData` hook in `Home.tsx`
  - Call hook with `selectedAlert?.siteIncidentId`
  - Set `enabled` to `!!selectedAlert?.siteIncidentId`
  - Store incident data in component state
  - Handle loading and error states
  - _Requirements: 1.1, 1.2, 1.4, 4.1, 5.4, 5.5_

- [x] 3.3 Add incident circle calculation with memoization

  - Use `useMemo` to calculate incident circle
  - Depend on `incident?.siteAlerts` array
  - Map alerts to FirePoint array
  - Call `generateIncidentCircle` with 2km padding
  - Store result in memoized variable
  - _Requirements: 2.1, 6.1, 6.2, 5.1_

- [x] 3.4 Integrate circle rendering into map

  - Add `renderIncidentCircle()` call in MapboxGL.MapView
  - Position after site polygons and before alert markers
  - Add conditional rendering (only if circle data exists)
  - Verify layer hierarchy is correct
  - _Requirements: 2.2, 2.6, 5.2_

- [x] 3.5 Implement circle cleanup logic

  - Add cleanup in modal `onBackdropPress` handler
  - Clear incident circle data when modal closes
  - Clear incident circle data when different alert selected
  - Add useEffect cleanup for component unmount
  - _Requirements: 2.5, 6.6_

- [x] 3.6 Add performance optimizations

  - Verify `useMemo` is used for circle calculation
  - Verify conditional rendering prevents unnecessary renders
  - Verify circle polygon uses 64 steps (from utility)
  - Test map FPS with incident circle visible
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3.7 Checkpoint - Verify Phase 3 map integration
  - Test circle rendering on iOS simulator
  - Test circle rendering on Android emulator
  - Verify colors match web implementation
  - Verify layer hierarchy is correct
  - Verify performance meets targets (>30 FPS)
  - Ask the user if questions arise

---

# PHASE 4: MODAL ENHANCEMENT (Requirement 3)

## Phase 4.1: Alert Details Modal Integration

- [x] 4.1 Integrate IncidentSummaryCard into alert modal

  - Import `IncidentSummaryCard` component in `Home.tsx`
  - Add conditional rendering based on incident data availability
  - Position card above existing alert details
  - Pass required props: `isActive`, `startAlert`, `latestAlert`, `allAlerts`
  - _Requirements: 3.1, 3.2, 4.3_

- [x] 4.2 Update modal layout and spacing

  - Add appropriate spacing between summary card and alert details
  - Ensure modal scrolls correctly with additional content
  - Test on different screen sizes
  - Verify bottom sheet height adjusts correctly
  - _Requirements: 3.1_

- [x] 4.3 Add loading state handling

  - Show loading indicator while fetching incident data
  - Don't block alert details from displaying
  - Show summary card only after incident data loads
  - Handle error state gracefully (show alert only)
  - _Requirements: 1.5, 5.7_

- [x] 4.4 Update modal close handler

  - Clear `selectedAlert` state
  - Clear incident circle data
  - Ensure proper cleanup of all incident-related state
  - _Requirements: 2.5, 6.6_

- [x] 4.5 Checkpoint - Verify Phase 4 modal enhancement
  - Test modal with incident data
  - Test modal without incident data
  - Test modal scrolling behavior
  - Test modal close and cleanup
  - Ask the user if questions arise

---

# PHASE 5: TESTING & POLISH (All Requirements)

## Phase 5.1: Integration Testing

- [ ] 5.1 Test alert with incident flow

  - Tap alert marker with incident
  - Verify incident data fetched
  - Verify circle rendered on map
  - Verify summary card displayed in modal
  - Close modal and verify cleanup
  - _Requirements: 1.1, 1.2, 2.2, 3.1_

- [ ] 5.2 Test alert without incident flow

  - Tap alert marker without incident
  - Verify no incident fetch attempted
  - Verify no circle rendered
  - Verify only alert details shown
  - _Requirements: 1.4, 5.7_

- [ ] 5.3 Test multiple alert selection

  - Tap first alert with incident A
  - Verify incident A displayed
  - Tap second alert with incident B
  - Verify incident B displayed and incident A removed
  - _Requirements: 2.5, 6.4_

- [ ] 5.4 Test error handling

  - Simulate network error during incident fetch
  - Verify alert details still display
  - Verify no crash or UI blocking
  - Verify error logged to console
  - _Requirements: 1.3, 1.4, 5.7_

## Phase 5.2: Platform Testing

- [ ] 5.5 Test on iOS

  - Test on iOS simulator (latest version)
  - Verify incident circle renders correctly
  - Verify colors match design
  - Verify summary card layout is correct
  - Verify dates format correctly
  - Test on physical iOS device (if available)
  - _Requirements: All_

- [ ] 5.6 Test on Android

  - Test on Android emulator (latest version)
  - Verify incident circle renders correctly
  - Verify colors match design
  - Verify summary card layout is correct
  - Verify dates format correctly
  - Test on physical Android device (if available)
  - _Requirements: All_

## Phase 5.3: Performance Testing

- [ ] 5.7 Measure and verify performance

  - Test circle calculation time with 10, 50, 100 fire points
  - Verify calculation completes in <50ms
  - Test circle rendering time
  - Verify rendering completes in <100ms
  - Test modal opening time
  - Verify modal opens in <200ms
  - Test map FPS with circle visible
  - Verify FPS stays >30
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5.8 Test memory usage

  - Monitor memory usage with incident circle visible
  - Close modal and verify memory is released
  - Repeat multiple times to check for memory leaks
  - Verify no memory leaks detected
  - _Requirements: 6.6_

## Phase 5.4: Code Quality & Documentation

- [x] 5.9 Code review and refinement

  - Review all new code for SOLID principles
  - Verify TypeScript types are correct
  - Verify error handling is comprehensive
  - Verify code follows existing patterns
  - Address any code review feedback
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 5.10 Add JSDoc comments

  - Add JSDoc to all public functions
  - Add JSDoc to all components
  - Add JSDoc to all hooks
  - Document parameters and return types
  - Add usage examples where helpful
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.11 Update documentation

  - Document new components in README (if applicable)
  - Document new utilities in README (if applicable)
  - Document color constants usage
  - Add screenshots of incident display (if applicable)
  - _Requirements: All_

## Phase 5.5: Final Verification

- [ ] 5.12 Run full test suite

  - Run all unit tests: `yarn nativeapp test`
  - Verify all tests pass
  - Verify test coverage meets standards
  - _Requirements: All_

- [x] 5.13 Verify no regressions

  - Test existing alert display functionality
  - Test existing site display functionality
  - Test existing map interactions
  - Verify no breaking changes
  - _Requirements: 5.7_

- [x] 5.14 Verify no new dependencies

  - Check `package.json` for new dependencies
  - Verify only existing packages are used
  - Verify no version changes
  - _Requirements: 5.6_

- [x] 5.15 Final checkpoint - Feature complete
  - All acceptance criteria met
  - All tests passing
  - No regressions detected
  - Performance targets met
  - Code reviewed and approved
  - Ready for deployment

---

## Notes

- All tasks should be completed in order within each phase
- Each phase builds on previous phases; do not skip ahead
- Checkpoints are critical - stop and verify before proceeding
- If any task reveals issues, address them before continuing
- Use existing patterns and conventions from the codebase
- Follow SOLID principles for all new code
- Test on both iOS and Android throughout development
- Performance testing should be done continuously, not just at the end
