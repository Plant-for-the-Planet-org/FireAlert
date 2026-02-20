# Settings Screen

The Settings screen provides configuration and management for monitoring sites, notification methods, and user preferences in the FireAlert application.

## Directory Structure

```
Settings/
├── components/          # Presentational UI components
│   ├── EditSiteModal.tsx
│   ├── MySitesSection.tsx
│   ├── NotificationMethodRows.tsx
│   ├── NotificationsSection.tsx
│   ├── ProjectsSection.tsx
│   ├── RadiusDropdownOverlay.tsx
│   ├── SatelliteInfoSection.tsx
│   ├── SiteInfoSheet.tsx
│   ├── SiteRow.tsx
│   └── WarningSections.tsx
├── hooks/               # Business logic hooks
│   ├── useAlertPreferencesVM.ts
│   ├── useSettingsActions.ts
│   └── useSettingsData.ts
├── styles/              # Style definitions
│   ├── infoCardStyles.ts
│   ├── modalStyles.ts
│   ├── notificationStyles.ts
│   ├── sharedStyles.ts
│   └── sitesStyles.ts
├── types.ts             # TypeScript type definitions
└── Settings.tsx         # Container component (orchestration only)
```

## Architecture

The Settings screen follows a **container-component pattern** with clear separation of concerns:

### Container Component (`Settings.tsx`)

- **Purpose**: Orchestration and composition only
- **Responsibilities**:
  - Initialize custom hooks
  - Handle navigation
  - Compose UI components
  - Manage modal/sheet visibility state
  - Handle pull-to-refresh
- **No business logic**: All data fetching and mutations are delegated to hooks

### Custom Hooks (`hooks/`)

#### `useSettingsData`

Fetches and caches all Settings screen data using tRPC queries.

**Returns:**

- `sites`: Array of all user sites
- `groupedProjects`: Sites grouped by Plant-for-the-Planet projects
- `alertMethods`: Alert methods categorized by type (email, sms, device, etc.)
- `deviceAlertPreferences`: Device-specific alert preferences
- `isLoading`: Initial loading state
- `isFetching`: Background fetching state
- `refetch()`: Manual refetch for pull-to-refresh

**Caching Strategy:**

- Sites: `staleTime: Infinity` (cache indefinitely)
- Alert methods: `staleTime: 5 minutes`
- Retry: 3 attempts with 3s delay

**Example:**

```typescript
const {sites, alertMethods, isLoading, refetch} = useSettingsData();

// Pull-to-refresh
const onRefresh = async () => {
  setRefreshing(true);
  await refetch();
  setRefreshing(false);
};
```

#### `useSettingsActions`

Wraps tRPC mutations for all Settings operations with optimistic updates.

**Returns:**

- `updateSite(siteId, data)`: Update site properties
- `deleteSite(siteId)`: Delete a site
- `toggleSiteMonitoring(siteId, enabled)`: Enable/disable site monitoring
- `toggleAlertMethod(methodId, enabled)`: Enable/disable notification method
- `removeAlertMethod(methodId)`: Remove notification method
- `isUpdating`: Loading state for updates
- `isDeleting`: Loading state for deletions

**Optimistic Updates:**

- Updates cache immediately before server response
- Rolls back on error
- Shows toast notifications for success/failure

**Example:**

```typescript
const {toggleSiteMonitoring, isUpdating} = useSettingsActions();

await toggleSiteMonitoring('site-id', false); // Disable monitoring
```

#### `useAlertPreferencesVM`

View Model hook for filtering device-specific alert preferences.

**Returns:**

- `deviceAlertPreferences`: Filtered device preferences (current device first)
- `refreshDevicePreferences()`: Manual refresh function

**Filtering Logic:**

1. Returns empty array if OneSignal userId is null
2. Filters device methods by current device ID
3. Prioritizes current device in results
4. Filters out entries with empty device names

**Example:**

```typescript
const {deviceAlertPreferences} = useAlertPreferencesVM(alertMethods);

// Current device's alert method appears first in the array
```

### UI Components (`components/`)

All components are **pure presentational components** that:

- Receive data via props
- Emit events via callback props
- Make no direct API calls
- Make no direct Redux access

#### Section Components

- **`ProjectsSection`**: Displays Plant-for-the-Planet projects with grouped sites
- **`MySitesSection`**: Displays user-created sites with add/edit/delete actions
- **`NotificationsSection`**: Displays alert methods categorized by type
- **`WarningSections`**: Info cards and warning messages
- **`SatelliteInfoSection`**: NASA FIRMS information and footer links

#### Row Components

- **`SiteRow`**: Reusable site list item with monitoring toggle
- **`NotificationMethodRows`**: Alert method rows with enable/verify/remove actions

#### Modal/Sheet Components

- **`SiteInfoSheet`**: Detailed site information with actions
- **`EditSiteModal`**: Edit site name and radius
- **`RadiusDropdownOverlay`**: Radius selection dropdown

### Styles (`styles/`)

Styles are organized by purpose:

- **`sharedStyles.ts`**: Container, section headers, dividers
- **`sitesStyles.ts`**: Site rows, add buttons, empty states
- **`notificationStyles.ts`**: Notification cards and method rows
- **`modalStyles.ts`**: Sheets and radius dropdown
- **`infoCardStyles.ts`**: Info cards, warnings, satellite section

All styles use `StyleSheet.create()` and reference shared theme tokens from `app/styles/`.

## Data Flow

```
Screen Mount
    ↓
useSettingsData (fetch sites & alert methods)
    ↓
React Query Cache
    ↓
useAlertPreferencesVM (filter device preferences)
    ↓
Render UI Components
    ↓
User Interaction (toggle, edit, delete)
    ↓
useSettingsActions (optimistic update + mutation)
    ↓
Cache Update → Server Request
    ↓
Success: Confirm | Error: Rollback + Toast
    ↓
UI Re-renders
```

## Data Transformations

### Project Grouping

Sites with `projectId` are grouped using `groupSitesAsProject()` utility:

```typescript
// Input: Array of sites
[
  { id: '1', name: 'Site A', project: { id: 'proj1', name: 'Forest' } },
  { id: '2', name: 'Site B', project: { id: 'proj1', name: 'Forest' } },
  { id: '3', name: 'Site C', project: null }
]

// Output: Grouped projects
[
  { projectId: 'proj1', projectName: 'Forest', sites: [Site A, Site B] }
]
// Site C appears in "My Sites" section
```

### Alert Method Categorization

Alert methods are categorized by type using `categorizedRes()` utility:

```typescript
// Input: Array of alert methods
[
  { id: '1', method: 'EMAIL', destination: 'user@example.com' },
  { id: '2', method: 'SMS', destination: '+1234567890' },
  { id: '3', method: 'DEVICE', destination: 'onesignal-id' }
]

// Output: Categorized methods
{
  email: [{ id: '1', ... }],
  sms: [{ id: '2', ... }],
  device: [{ id: '3', ... }],
  whatsapp: [],
  webhook: []
}
```

## Navigation

### From Settings to Home

Navigate to Home screen with site details:

```typescript
navigation.navigate('Home', {
  bboxGeo: [minLng, minLat, maxLng, maxLat],
  siteInfo: [siteFeature],
});
```

### From Settings to Verification

Navigate to add/verify alert methods:

```typescript
// Add new method
navigation.navigate('Verification', {
  method: 'email' | 'sms' | 'whatsapp' | 'webhook',
});

// Verify existing method
navigation.navigate('Otp', {
  alertMethodId: 'method-id',
  destination: 'user@example.com',
  method: 'email',
});
```

## Pull-to-Refresh

The Settings screen supports pull-to-refresh to manually update data:

```typescript
const {refetch} = useSettingsData();

const onRefresh = async () => {
  setRefreshing(true);
  await refetch(); // Refetches sites and alert methods
  setRefreshing(false);
};

<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }>
  {/* Content */}
</ScrollView>;
```

## Site Management Rules

### Planet RO Sites

Sites synced from Plant-for-the-Planet platform (`isPlanetRO: true`) have restrictions:

- **Cannot be deleted** (delete button disabled)
- Can toggle monitoring on/off
- Can edit name and radius
- Grouped under project name in ProjectsSection

### User-Created Sites

Sites created by the user (`isPlanetRO: false`):

- Full edit/delete permissions
- Displayed in MySitesSection
- Can be converted to different geometry types

## Testing

Tests are located in `apps/nativeapp/__tests__/screens/Settings/`:

- **Hook tests**: Unit tests for all custom hooks
- **Component tests**: Snapshot and interaction tests for UI components

Run tests:

```bash
yarn test Settings
```

## Requirements

This implementation satisfies requirements:

- 1.2, 1.3, 1.7: Code organization and module structure
- 5.5-5.7: Custom hooks for business logic
- 6.7-6.14: UI component extraction
- 9.1-9.7: Data fetching and caching
- 10.1-10.7: Optimistic updates and error handling
- 12.1-12.8: Site management operations
- 13.1-13.7: Alert method management
- 23.1-23.4: Project and site grouping
- 24.1-24.5: Alert method categorization
- 25.1-25.5: Device-specific alert preferences
- 26.1-26.6: Pull-to-refresh functionality

See `.kiro/specs/home-settings-refactor/requirements.md` for full details.
