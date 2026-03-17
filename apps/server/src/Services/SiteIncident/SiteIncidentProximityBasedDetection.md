To Find Active SiteIncidents

```js
// Check for active incident
      this.metrics.startTimer('find_active_incident');
      const activeIncident = await this.repository.findActiveBySiteId(
        alert.siteId,
      );
      this.metrics.endTimer('find_active_incident');

      let incident: SiteIncident;

      if (activeIncident) {
        // Defensive check: If incident should be resolved (stale), resolve it first (This Defensive Check would not be needing.)
        const now = new Date();
        const inactiveMs = now.getTime() - activeIncident.updatedAt.getTime();
        const inactiveHours = inactiveMs / (1000 * 60 * 60);

        if (inactiveHours >= this.inactiveHours) {
          ...
          // This Code inside can be cleaned up
          // Beause of Reason - 1
        } else {

        }
      } else {

      }
```

Reason 1

```js
// site-incident-manager.ts resolves all inactive incidents before.

// 3. Resolve Inactive Incidents FIRST
let resolvedCount = 0;
try {
  resolvedCount = await siteIncidentService.resolveInactiveIncidents();
} catch (error) {
  // Continue processing even if resolution fails
}
```

We will look for Active Incidents in the Site & Calculate distance between the Centre (centroid) of the Incident & Alert,
if That is less than env.INCIDENT_PROXIMITY_KM we will Associate the Alert with the Active Incident.
else we will create a new Incident for the Alert.

If found Multiple Incidents - see closest Incident & Associate with it.
As you add new centres to the Incident,

- update the latestSiteAlertId field.
- update the metadata.centres array. use latestSiteAlertId.eventAt as the at field of metadata.centres.

SiteIncident.metadata = {
centres: [
{ latitude: number, longitude: number, at: Date },
],
}

Incident Resolution Stays Exactly Same.
