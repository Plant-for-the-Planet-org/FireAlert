# Tasks: Home Map Display Mode

## Phase 1: Core Components

- [ ] 1.1 Create MapDisplayModeSwitcher component

  - [x] 1.1.1 Create component file with TypeScript interface
  - [x] 1.1.2 Implement icon-only segmented control UI
  - [x] 1.1.3 Add RadarIcon and IncidentActiveIcon
  - [x] 1.1.4 Implement active/inactive styling
  - [x] 1.1.5 Add onModeChange callback
  - [x] 1.1.6 Add accessibility labels

- [ ] 1.2 Create MapDurationDropdown component

  - [x] 1.2.1 Create component file with TypeScript interface
  - [x] 1.2.2 Implement dropdown button UI
  - [x] 1.2.3 Add duration options (1d, 3d, 7d, 30d)
  - [x] 1.2.4 Implement dropdown menu with selection
  - [x] 1.2.5 Add onDurationChange callback
  - [x] 1.2.6 Set default to 7 days

- [x] 1.3 Create IncidentDetailsBottomSheet component
  - [x] 1.3.1 Create component file with TypeScript interface
  - [x] 1.3.2 Integrate @gorhom/bottom-sheet
  - [x] 1.3.3 Add incident data fetching with tRPC
  - [x] 1.3.4 Render IncidentSummaryCard at top
  - [x] 1.3.5 Implement FlatList for alert items
  - [x] 1.3.6 Add alert item tap handler
  - [x] 1.3.7 Add loading and error states
  - [x] 1.3.8 Add close handler

## Phase 2: Home Screen Integration

- [x] 2.1 Add state management to Home.tsx

  - [x] 2.1.1 Add mapDisplayMode state (default: 'alerts')
  - [x] 2.1.2 Add mapDurationDays state (default: 7)
  - [x] 2.1.3 Add selectedIncidentId state
  - [x] 2.1.4 Update existing selectedAlert state handling

- [x] 2.2 Implement mode switching logic

  - [x] 2.2.1 Add handleModeChange function
  - [x] 2.2.2 Clear conflicting state on mode change
  - [x] 2.2.3 Update map rendering based on mode

- [x] 2.3 Implement duration filtering

  - [x] 2.3.1 Add handleDurationChange function
  - [x] 2.3.2 Create filteredAlerts useMemo hook
  - [x] 2.3.3 Apply duration filter to alert queries

- [x] 2.4 Implement incident composition
  - [x] 2.4.1 Create composeIncidents function
  - [x] 2.4.2 Group alerts by siteIncidentId
  - [x] 2.4.3 Calculate incident circles
  - [x] 2.4.4 Cap at N=60 incidents
  - [x] 2.4.5 Create composedIncidents useMemo hook

## Phase 3: Map Rendering

- [x] 3.1 Update alert marker rendering

  - [x] 3.1.1 Conditionally render based on mapDisplayMode
  - [x] 3.1.2 Apply duration filter to markers
  - [x] 3.1.3 Update marker tap handler

- [x] 3.2 Implement incident circle rendering

  - [x] 3.2.1 Create renderIncidentCircles function
  - [x] 3.2.2 Render circles for composedIncidents
  - [x] 3.2.3 Add circle tap handler
  - [x] 3.2.4 Apply active/resolved styling

- [x] 3.3 Ensure site overlays remain visible
  - [x] 3.3.1 Verify site boundaries render in both modes
  - [x] 3.3.2 Verify site polygons render in both modes

## Phase 4: UI Integration

- [x] 4.1 Add controls to Home screen

  - [x] 4.1.1 Position MapDisplayModeSwitcher on map
  - [x] 4.1.2 Position MapDurationDropdown on map
  - [x] 4.1.3 Ensure controls don't overlap existing UI
  - [x] 4.1.4 Add proper z-index layering

- [x] 4.2 Integrate IncidentDetailsBottomSheet

  - [x] 4.2.1 Add bottom sheet to Home screen JSX
  - [x] 4.2.2 Connect to selectedIncidentId state
  - [x] 4.2.3 Implement onClose handler
  - [x] 4.2.4 Implement onAlertTap handler with map centering

- [x] 4.3 Update existing AlertDetailsBottomSheet
  - [x] 4.3.1 Ensure it only shows in 'alerts' mode
  - [x] 4.3.2 Verify existing functionality unchanged

## Phase 5: Testing & Polish

- [x] 5.1 Unit tests

  - [x] 5.1.1 Test composeIncidents function
  - [x] 5.1.2 Test filterAlertsByDuration function
  - [x] 5.1.3 Test state transitions
  - [x] 5.1.4 Test N=60 cap

- [x] 5.2 Integration tests

  - [x] 5.2.1 Test mode switching with real data
  - [x] 5.2.2 Test duration changes
  - [x] 5.2.3 Test bottom sheet interactions
  - [x] 5.2.4 Test map interactions

- [x] 5.3 Performance optimization

  - [x] 5.3.1 Verify memoization working correctly
  - [x] 5.3.2 Test with large datasets (100+ alerts)
  - [x] 5.3.3 Profile rendering performance

- [x] 5.4 Polish and refinement
  - [x] 5.4.1 Add loading states
  - [x] 5.4.2 Add empty states
  - [x] 5.4.3 Add error handling
  - [x] 5.4.4 Verify accessibility
  - [x] 5.4.5 Test on iOS and Android
