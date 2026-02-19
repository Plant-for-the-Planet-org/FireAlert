# NativeApp Deep Linking Plan: Incident Notifications and State Passing

## Summary
- Configure deep linking for `apps/nativeapp` so tapping a notification opens the app on `Home` with incident context.
- Pass state needed to resolve alert/incident details in the app.
- Keep UI rendering changes out of scope.
- Include two fallback pathways when the app cannot open the link:
  1. Redirect to App Store / Play Store.
  2. Open incident details on web.

## Goal
When a user taps an incident notification, the app should land on `Home` and have enough state (`incidentId` and/or `alertId`) to show incident details through existing data flows.

## In Scope
- URL contract and deep-link parsing.
- Android and iOS deep-link configuration.
- Notification tap handling and navigation routing.
- Passing deep-link state into `Home`.
- Web/store fallback strategy and link templates.

## Out of Scope
- Any UI redesign or visual implementation in `Home`.
- Backend feature expansion beyond notification payload shape.

## Current Architecture Notes
- React Native: `0.81.4`
- Navigation: `@react-navigation/native` v7 with:
  - `CommonStack -> BottomTab -> Home`
- OneSignal integration exists and exposes `onOpened` callback.
- Existing web host already used in links: `firealert.plant-for-the-planet.org`.

## Link Contract (Canonical)
Support these app-entry links:

- Web links:
  - `https://firealert.plant-for-the-planet.org/alert/:alertId`
  - `https://firealert.plant-for-the-planet.org/incident/:incidentId`
- App-scheme links:
  - `firealert://alert/:alertId`
  - `firealert://incident/:incidentId`

Also support query aliases for compatibility:
- Alert: `alertId`, `alert_id`, `siteAlertId`
- Incident: `incidentId`, `incident_id`, `siteIncidentId`

## Implementation Plan

### 1) Add Central Deep Link Parser
Create a utility module to parse:
- incoming app URLs (`Linking`)
- OneSignal open payload (`launchURL` + `additionalData`)

Expected output type:
- `source: 'url' | 'notification'`
- `alertId?: string`
- `incidentId?: string`
- `rawUrl?: string`
- `alertPayload?: Record<string, unknown>`

This module should be the single source of truth for parsing.

### 2) Configure Native Platforms
Android (`apps/nativeapp/android/app/src/main/AndroidManifest.xml`)
- Add intent filter for:
  - `https://firealert.plant-for-the-planet.org/alert/*`
  - `https://firealert.plant-for-the-planet.org/incident/*`
- Add custom scheme filter:
  - `firealert://alert/*`
  - `firealert://incident/*`

iOS
- `apps/nativeapp/ios/FireAlert/AppDelegate.swift`
  - Forward `openURL` and `continueUserActivity` to `RCTLinkingManager`.
- `apps/nativeapp/ios/FireAlert/Info.plist`
  - Add URL scheme registration for `firealert`.

### 3) Route Links in AppNavigator
In `apps/nativeapp/app/routes/AppNavigator.tsx`:
- Parse URLs from:
  - `Linking` initial URL + runtime events.
  - OneSignal `onOpened` callback.
- Route parsed links to:
  - `navigate('BottomTab', { screen: 'Home', params: { deepLink } })`
- Add pending-link queue for login/bootstrap cases:
  - If app is not logged in yet or navigator not ready, store pending deep link.
  - Replay once login and navigation are ready.

### 4) Consume Deep-Link State in Home
In `apps/nativeapp/app/screens/Home/Home.tsx`:
- Read `route.params.deepLink`.
- Resolve selected target from alerts data:
  1. Exact alert match by `alertId`.
  2. Fallback by first alert matching `siteIncidentId`.
- If list match is unavailable, build minimal fallback selected state from payload IDs.
- Clear consumed deep-link param to avoid duplicate re-processing.

### 5) Notification Payload Requirements
For robust app routing, device notifications should include:
- `url` (canonical web URL)
- `data` with IDs

Minimum recommended payload:
- Incident notification:
  - `url: https://firealert.plant-for-the-planet.org/incident/<incidentId>`
  - `data.incidentId: <incidentId>`
- Alert notification:
  - `url: https://firealert.plant-for-the-planet.org/alert/<alertId>`
  - `data.alertId: <alertId>`

## Fallback Pathways (No App Installed)

### Pathway A (Recommended): Web-first universal link
- Send the canonical web URL directly.
- Behavior:
  - App installed: opens app.
  - App missing: opens browser incident/alert page.

### Pathway B: Store-first landing URL
- Use landing page URL, for example:
  - `https://firealert.plant-for-the-planet.org/open/incident/<incidentId>?fallback=store`
- Landing behavior:
  - Attempt `firealert://incident/<incidentId>`.
  - If app does not open after timeout (~1.5s), redirect to:
    - iOS store page
    - Android play store page
  - Provide "Continue on Web" option.

## Testing Plan

### Parser tests
- Parse valid alert/incident web URLs.
- Parse custom-scheme URLs.
- Parse query alias URLs.
- Parse notification payloads (URL-only, data-only, mixed).
- Reject unsupported/malformed URLs.

### Navigation tests
- App warm: link tap routes to `Home`.
- App cold: initial link routes after bootstrap.
- Notification tap from foreground/background/terminated.
- Logged-out tap: queue + replay after login.

### Manual platform tests
- Android `adb` deep-link intent tests.
- iOS simulator deep-link tests.
- OneSignal test notifications for both alert and incident links.

## Acceptance Criteria
- Tapping incident notification opens `Home` with incident state available.
- Tapping alert notification opens `Home` with alert state available.
- No regression in normal app startup/navigation when no link is present.
- Both fallback pathways are documented and usable.

## Risks and Mitigations
- Risk: payload key inconsistency.
  - Mitigation: parser supports alias keys and logs parse failures.
- Risk: deep-link consumed before auth/nav ready.
  - Mitigation: pending deep-link queue + replay.
- Risk: repeated handling on rerender.
  - Mitigation: clear route param after consumption.

## Rollout Notes
- Ship parser + routing first behind existing flows (non-breaking).
- Coordinate notification payload key usage with server team.
- Validate universal links and app-scheme links in staging before release.
