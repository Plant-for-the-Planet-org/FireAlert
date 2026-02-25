# Fire Incident Spec Summary

This is a compact summary of intent from:
- `.kiro/specs/fire-incident/*`
- `.kiro/specs/fire-incident-cron/*`
- `.kiro/specs/fire-incident-notifications/*`

## Intended product behavior
- Group related fire detections into one incident record per site over an activity window.
- Notify at incident boundaries (start and end), not every detection for all channels.
- Preserve full incident history for review and investigation.

## Intended technical behavior
- Enforce incident lifecycle transitions and one-active-incident-per-site semantics.
- Close incidents after inactivity threshold.
- Create and send incident notifications with explicit status transitions.
- Support API access for incident viewing and review-status mutation.

## Notification intent by channel
- real-time channels can remain per-alert
- user-facing channels should be aggregated per-incident

## Testing intent
- unit and integration coverage of lifecycle and notification flows
- correctness/property-style checks for invariants
- performance targets for CRON-scale processing
