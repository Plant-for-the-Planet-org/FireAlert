# Home Screen

The Home screen is the main map-based interface for viewing fire alerts and monitoring sites in the FireAlert application.

## Directory Structure

```
Home/
├── components/          # Presentational UI components
│   ├── AlertDetailsSheet.tsx
│   ├── EditProfileModal.tsx
│   ├── EditSiteModal.tsx
│   ├── HomeFloatingActions.tsx
│   ├── HomeMapSources.tsx
│   ├── HomeMapView.tsx
│   ├── IncidentDebugOverlay.tsx
│   ├── PermissionModals.tsx
│   ├── ProfileSheet.tsx
│   └── SiteDetailsSheet.tsx
├── hooks/               # Business logic hooks
│   ├── useHomeIncidentCircle.ts
│   ├── useHomeLocation.ts
│   ├── useHomeMapSelection.ts
│   └── useHomeSiteActions.ts
├── styles/              # Style definitions
│   ├── actionStyles.ts
│   ├── mapStyles.ts
│   ├── modalStyles.ts
│   └── sharedStyles.ts
├── types.ts             # TypeScript type definitions
└── Home.tsx             # Container component (orchestration only)
```

## Architecture

The Home screen follows a **container-component pattern** with clear separation of concerns:

### Container Component (`Home.tsx`)

- **Purpose**: Orchestration and composition only
- **Responsibilities**:
  - Initialize custom hooks
  - Handle navigation and route parameters
  - Compose UI components
  - Manage modal visibility state
- **No business logic**: All data fetching and mutations are delegated to hooks

### Custom Hooks (`hooks/`)

#### `useHomeLocation`

Manages location permissions and device location state.

**Returns:**

- `location`: Current device location
- `isPermissionDenied`: Permission temporarily denied
- `isPermissionBlocked`: Permission permanently blocked
- `requestLocation()`: Request location permission
- `clearPermissionState()`: Clear permission denial state

**Example:**

```typescript
const {location, isPermissionDenied, requestLocation} = useHomeLocation();

useEffect(() => {
  if (!location) {
    requestLocation();
  }
}, []);
```

#### `useHomeSiteActions`

Wraps tRPC mutations for site operations with optimistic updates.

**Returns:**

- `updateSite(siteId, data)`: Update site name, radius, or monitoring status
- `deleteSite(siteId)`: Delete a site
- `isUpdating`: Loading state for updates
- `isDeleting`: Loading state for deletions

**Example:**

```typescript
const {updateSite, isUpdating} = useHomeSiteActions();

await updateSite('site-id', {name: 'New Name', radius: 5000});
```

#### `useHomeIncidentCircle`

Fetches incident data and generates circle geometry for map visualization.

**Returns:**

- `incidentCircleData`: Circle geometry and metadata
- `generateCircle(incidentId)`: Generate circle from incident ID
- `clearCircle()`: Clear circle data

**Example:**

```typescript
const {incidentCircleData, generateCircle} = useHomeIncidentCircle();

useEffect(() => {
  if (route.params?.siteIncidentId) {
    generateCircle(route.params.siteIncidentId);
  }
}, [route.params?.siteIncidentId]);
```

#### `useHomeMapSelection`

Manages map selection state (sites, alerts, areas).

**Returns:**

- `selectedSite`: Currently selected site
- `selectedAlert`: Currently selected alert
- `selectedArea`: Currently selected area (for highlighting)
- `setSelectedSite()`, `setSelectedAlert()`, `setSelectedArea()`: Setters
- `clearSelection()`: Clear all selections

### UI Components (`components/`)

All components are **pure presentational components** that:

- Receive data via props
- Emit events via callback props
- Make no direct API calls
- Make no direct Redux access

#### Map Components

- **`HomeMapView`**: Renders Mapbox map with camera controls
- **`HomeMapSources`**: Renders GeoJSON sources and layers for sites/alerts
- **`HomeFloatingActions`**: Floating action buttons (layer, location, profile)
- **`IncidentDebugOverlay`**: Debug information for incident circles

#### Sheet Components

- **`ProfileSheet`**: User profile display with edit/logout actions
- **`AlertDetailsSheet`**: Fire alert information and actions
- **`SiteDetailsSheet`**: Site details with monitoring toggle and edit/delete

#### Modal Components

- **`EditSiteModal`**: Edit site name and radius
- **`EditProfileModal`**: Edit user profile name
- **`PermissionModals`**: Location permission alerts (denied/blocked)

### Styles (`styles/`)

Styles are organized by purpose:

- **`sharedStyles.ts`**: Container, loading, and common styles
- **`mapStyles.ts`**: Map, polygon, point, and marker styles
- **`modalStyles.ts`**: Modal and bottom sheet styles
- **`actionStyles.ts`**: Floating button and overlay styles

All styles use `StyleSheet.create()` and reference shared theme tokens from `app/styles/`.

## Data Flow

```
User Interaction
    ↓
UI Component (emits callback)
    ↓
Container (calls hook function)
    ↓
Custom Hook (tRPC mutation)
    ↓
Optimistic Cache Update
    ↓
Server Request
    ↓
Success: Confirm cache | Error: Rollback cache
    ↓
UI Re-renders with updated data
```

## Navigation

The Home screen accepts route parameters for deep linking:

```typescript
navigation.navigate('Home', {
  bboxGeo: [minLng, minLat, maxLng, maxLat], // Fit map to bounds
  siteInfo: [siteFeature], // Select and highlight site
  siteIncidentId: 'uuid', // Render incident circle
});
```

## Testing

Tests are located in `apps/nativeapp/__tests__/screens/Home/`:

- **Hook tests**: Unit tests for all custom hooks
- **Component tests**: Snapshot and interaction tests for UI components

Run tests:

```bash
yarn test Home
```

## Requirements

This implementation satisfies requirements:

- 1.1, 1.3, 1.6: Code organization and module structure
- 5.1-5.4: Custom hooks for business logic
- 6.1-6.9: UI component extraction
- 11.1-11.7: Location permission management
- 12.1-12.8: Site management operations
- 15.1-15.8: Map rendering and interaction
- 22.1-22.6: Incident circle rendering

See `.kiro/specs/home-settings-refactor/requirements.md` for full details.
