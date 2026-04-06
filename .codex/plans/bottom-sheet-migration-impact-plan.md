# Plan: Replace Modal-Based Bottom Sheet with `@gorhom/bottom-sheet` (Progressive rollout for Home + Settings + Protected Areas)

## Summary
- Replace the shared bottom-sheet implementation at `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/components/bottomSheet/BottomSheet.tsx` from `react-native-modal` to `@gorhom/bottom-sheet`.
- Keep current behavior compatible for existing screens first, while enabling advanced UX (minimized snap point, expand to half-screen, scrollable lists, stacked or replaceable sheet flows) for future Home work.
- Migrate first wave callsites progressively across:
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/Settings.tsx`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/ProtectedSitesSettings.tsx`

## Impact Calculation
- Direct bottom-sheet usage instances impacted: **5**
- Direct UI files impacted by shared-component swap: **4**
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/components/bottomSheet/BottomSheet.tsx`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/Settings.tsx`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/ProtectedSitesSettings.tsx`
- Supporting infra/config files likely impacted: **5**
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/package.json`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/yarn.lock`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/index.js`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/babel.config.js`
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/App.tsx`
- Total expected touched files in phase 1: **9–10**

## Important API / Interface Changes
- Keep exported component name `BottomSheet` from:
  - `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/components/index.tsx`
- Preserve existing props for compatibility:
  - `isVisible`
  - `onBackdropPress`
  - `onModalHide`
  - `backdropColor`
  - `maxHeight`
- Add forward-looking props (non-breaking):
  - `snapPoints` (default derived from `maxHeight` or `['50%']`)
  - `initialSnapIndex` (default `0`)
  - `enablePanDownToClose` (default `true`)
  - `enableDynamicSizing` (default `false` for deterministic behavior)
  - `stackBehavior` (`'replace' | 'stack'`, default `'replace'`)
- Deprecate no-op/legacy semantics:
  - `swipeDirection` (gorhom gestures are native sheet gestures; prop retained temporarily but ignored with warning in dev)

## Selected Alternative
- Primary choice: `@gorhom/bottom-sheet` v5 (community-standard RN bottom sheet).
- Supporting packages:
  - `react-native-gesture-handler`
  - `react-native-reanimated` **3.19.x line** (because this app is old architecture; Reanimated 4 is new-architecture only).

## Implementation Plan (No code execution yet)
1. Dependency and runtime wiring
- Add deps in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/package.json`.
- Add `import 'react-native-gesture-handler';` at app entry `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/index.js`.
- Add Reanimated Babel plugin as final plugin in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/babel.config.js`.
- Wrap app root in `GestureHandlerRootView` and `BottomSheetModalProvider` in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/App.tsx`.

2. Shared BottomSheet adapter replacement
- Re-implement `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/components/bottomSheet/BottomSheet.tsx` on gorhom modal primitives.
- Keep current callsites operational with `isVisible`-driven open/close.
- Implement backdrop press close behavior matching current UX.
- Map `maxHeight` to default snap point to preserve existing half-screen feel.
- Ensure pan-down dismissal triggers same close callback chain as current behavior.

3. Progressive callsite migration (first wave requested)
- Update Home sheets in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Home/Home.tsx`.
- Update Settings sheet in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/Settings.tsx`.
- Update Protected Areas sheet in `/Volumes/WDSN5000/Plant-for-the-Planet/FireAlert.worktrees/wt-fire-incident/apps/nativeapp/app/screens/Settings/ProtectedSitesSettings.tsx`.
- Normalize style assumptions where current containers rely on modal absolute positioning.

4. Future UX capability enablement (without implementing Home content changes now)
- Provide documented pattern in shared component for:
  - Minimized + half-screen snap points.
  - Scrollable sheet content using gorhom scrollables.
  - Two transition modes for list-item actions: `replace` and `stack`.
- Keep this as component capability only; no Home feature flow changes in this pass.

5. Cleanup and stabilization
- Keep `react-native-modal` temporarily for one release/QA cycle.
- Remove `react-native-modal` only after parity validation succeeds on both platforms.

## Test Cases and Scenarios
1. Parity regression (all existing sheets)
- Open from trigger.
- Close by backdrop tap.
- Close by swipe-down.
- Verify callback side effects still run (state reset in Home/Settings).

2. Interaction correctness
- Home map remains visible behind sheet.
- Sheet can snap to configured points and stop at half-screen.
- No gesture deadlock between map pan and sheet drag.

3. Platform checks
- Android: hardware back behavior with active sheet.
- iOS: smooth gesture + animation with Hermes.

4. Keyboard and input screens
- Ensure existing full-screen RN `Modal` flows (profile/site edit) are unaffected.

5. Performance checks
- Scroll behavior inside sheet is smooth with large lists (using gorhom scrollables; FlashList path reserved if needed later).

## Risks and Mitigations
- Risk: Reanimated version mismatch on old architecture.
- Mitigation: pin Reanimated to 3.19.x-compatible line; do not move to Reanimated 4 in this app state.

- Risk: Gesture conflicts with Mapbox map interactions.
- Mitigation: validate simultaneous gesture behavior and tune sheet gesture props during QA.

- Risk: Existing styles assume absolute modal layout.
- Mitigation: adjust sheet content container styles at each callsite.

- Risk: Behavior drift on close callbacks.
- Mitigation: adapter explicitly routes all close paths to current callbacks.

## Assumptions and Defaults
- Use `@gorhom/bottom-sheet` as the chosen replacement.
- Scope is infrastructure + component migration, not Home feature redesign.
- Progressive first wave includes Home + Settings + Protected Areas.
- Default interaction mode capability is `replace`, with `stack` available via prop.

## Research References
- [Gorhom Bottom Sheet docs](https://gorhom.dev/react-native-bottom-sheet/)
- [Gorhom Modal usage](https://gorhom.dev/react-native-bottom-sheet/modal/usage)
- [Gorhom methods](https://gorhom.dev/react-native-bottom-sheet/methods)
- [Gorhom troubleshooting](https://gorhom.dev/react-native-bottom-sheet/troubleshooting)
- [Gorhom releases](https://github.com/gorhom/react-native-bottom-sheet/releases)
- [Reanimated compatibility guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/)
