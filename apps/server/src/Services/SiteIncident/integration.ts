import {logger} from '../../server/logger';
import {prisma} from '../../server/db';
import {SiteIncidentRepository} from './SiteIncidentRepository';
import {IncidentResolver} from './IncidentResolver';
import {SiteIncidentService} from './SiteIncidentService';
import type {SiteAlert, GeoEvent} from '@prisma/client';

function createSiteIncidentService(): SiteIncidentService {
  const repository = new SiteIncidentRepository(prisma);
  const resolver = new IncidentResolver(repository);

  const inactiveHours = parseInt(process.env.INCIDENT_RESOLUTION_HOURS || '6', 10);
  const proximityKm = Number(process.env.INCIDENT_PROXIMITY_KM || '2');

  return new SiteIncidentService(repository, resolver, inactiveHours, proximityKm);
}

/**
 * Integration helper for SiteIncident creation when processing SiteAlerts.
 *
 * This is a compatibility helper for older integration paths.
 */
export async function processSiteAlertForIncident(
  siteAlert: SiteAlert,
  _geoEvent: GeoEvent,
): Promise<void> {
  try {
    const enableIncidentNotifications =
      process.env.ENABLE_INCIDENT_NOTIFICATIONS === 'true';

    if (!enableIncidentNotifications) {
      logger(
        'Incident notifications are disabled, skipping incident processing',
        'info',
      );
      return;
    }

    const service = createSiteIncidentService();
    const incident = await service.processNewSiteAlert(siteAlert);

    logger(
      `Processed SiteAlert ${siteAlert.id} for incident ${incident.id}`,
      'info',
    );
  } catch (error) {
    logger(
      `Failed to process SiteAlert ${siteAlert.id} for incident: ${String(
        error,
      )}`,
      'error',
    );
  }
}

/**
 * Closes inactive incidents.
 *
 * Compatibility wrapper over SiteIncidentService.resolveInactiveIncidents.
 */
export async function closeInactiveIncidentsWithNotifications(): Promise<number> {
  try {
    const service = createSiteIncidentService();
    const closedRoots = await service.resolveInactiveIncidents();

    logger(`Closed ${closedRoots} inactive root incidents`, 'info');
    return closedRoots;
  } catch (error) {
    logger(`Failed to close inactive incidents: ${String(error)}`, 'error');
    throw error;
  }
}

export function getIntegrationExample(): string {
  return `
// In apps/server/src/Services/SiteAlert/CreateSiteAlert.ts
// After creating SiteAlerts, add:

import { processSiteAlertForIncident } from '../SiteIncident/integration';

// After the SiteAlert creation query:
const createdAlerts = await prisma.siteAlert.findMany({
  where: { isProcessed: false },
  include: { site: true }
});

// Process each alert for incident tracking:
for (const alert of createdAlerts) {
  const geoEvent = await prisma.geoEvent.findUnique({
    where: { /* match by coordinates and date */ }
  });

  if (geoEvent) {
    await processSiteAlertForIncident(alert, geoEvent);
  }
}
`;
}
