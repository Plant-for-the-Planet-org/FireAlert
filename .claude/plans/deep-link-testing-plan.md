# Deep Link Testing Plan

## 1. Custom URL Scheme (`firealert://`)

Works immediately — no server deployment needed.

### iOS Simulator
```bash
# Alert deep link
xcrun simctl openurl booted "firealert://alert/REAL_ALERT_ID"

# Incident deep link
xcrun simctl openurl booted "firealert://incident/REAL_INCIDENT_ID"
```

### Android Emulator
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "firealert://alert/REAL_ALERT_ID" eco.pp.firealert

adb shell am start -W -a android.intent.action.VIEW \
  -d "firealert://incident/REAL_INCIDENT_ID" eco.pp.firealert
```

**Expected:** App opens, map navigates to the alert/incident, detail panel appears.

---

## 2. Universal / App Links (`https://firealert.plant-for-the-planet.org/...`)

Blocked until web team deploys `apple-app-site-association` and `assetlinks.json` to `/.well-known/`.

### iOS Simulator (after deployment)
```bash
xcrun simctl openurl booted \
  "https://firealert.plant-for-the-planet.org/alert/REAL_ALERT_ID"
```

### Android (after deployment)
```bash
# Verify domain association first
adb shell pm get-app-links eco.pp.firealert
# Should show: firealert.plant-for-the-planet.org: verified
```

---

## 3. Notification Deep Linking (OneSignal)

Use a real `alertId` or `incidentId` from the database. Send test pushes via the OneSignal dashboard or API.

### 3a. Foreground (app open and visible)
Send push with `additionalData`:
```json
{ "alertId": "REAL_ALERT_ID" }
```
**Expected:** Notification banner appears. Tapping it navigates to alert details.

### 3b. Background (app backgrounded, not killed)
1. Open app → press Home button
2. Send test push
3. Tap the notification

**Expected:** App comes to foreground and navigates directly to the alert/incident.

### 3c. Cold Start (app fully terminated)
1. Kill the app completely (swipe up from app switcher)
2. Send test push
3. Tap the notification

**Expected:** App launches fresh and opens directly to the alert/incident detail — not just the home screen.

> This case is handled by the `flushPendingNotification` mechanism in
> `app/utils/linking/handleNotificationOpen.ts` + `NavigationContainer onReady`.

---

## 4. OneSignal `additionalData` Payload Reference

| Field | Purpose |
|---|---|
| `alertId` | Opens alert detail panel |
| `incidentId` | Opens incident detail panel |
| `siteIncidentId` | Alias for `incidentId` |
| `url` | Explicit deep link URL — overrides all above fields |

---

## 5. Verification Checklist

- [ ] App opens on Home screen with map visible
- [ ] Detail panel opens automatically (alert or incident)
- [ ] Map camera pans to the item
- [ ] Tapping the same notification twice (after clearing app state) still works
- [ ] No crash, no infinite log loop in Metro console
- [ ] Existing navigation (login, settings, map) unaffected
