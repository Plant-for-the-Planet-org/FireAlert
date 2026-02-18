import {logger} from '../../server/logger';
import {siteIncidentService} from './SiteIncidentService';
import {notificationBoundaryService} from './NotificationBoundaryService';
import type {SiteAlert, GeoEvent} from '@prisma/client';

/**
 * Integration helper for SiteIncident creation when processing SiteAlerts
 *
 * This function should be called after a SiteAlert is created to:
 * 1. Check if an active incident exists for the site
 * 2. Create a new incident if none exists
 * 3. Associate the alert with the incident
 * 4. Create start notification if it's a new incident
 *
 * @param siteAlert - The newly created SiteAlert
 * @param geoEvent - The GeoEvent that triggered the alert
 */
export async function processSiteAlertForIncident(
  siteAlert: SiteAlert,
  geoEvent: GeoEvent,
): Promise<void> {
  try {
    // Check if incident notifications are enabled
    const enableIncidentNotifications =
      process.env.ENABLE_INCIDENT_NOTIFICATIONS === 'true';

    if (!enableIncidentNotifications) {
      logger(
        'Incident notifications are disabled, skipping incident processing',
        'info',
      );
      return;
    }

    // Create or update incident
    const incident = await siteIncidentService.createOrUpdateIncident(
      siteAlert.siteId,
      siteAlert,
      geoEvent,
    );

    // If this is a new incident (not processed yet), create start notification
    if (!incident.isProcessed && incident.isActive) {
      try {
        const notification =
          await notificationBoundaryService.createStartNotification(
            incident,
            siteAlert,
          );

        if (notification) {
          // Record that the notification was created
          await notificationBoundaryService.recordNotificationSent(
            incident.id,
            'START',
            notification.id,
          );

          logger(
            `Created start notification for incident ${incident.id}`,
            'info',
          );
        }
      } catch (error) {
        logger(
          `Failed to create start notification for incident ${
            incident.id
          }: ${String(error)}`,
          'error',
        );
        // Don't throw - we still want the alert to be processed even if notification fails
      }
    }

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
    // Don't throw - we don't want to block alert creation if incident processing fails
  }
}

/**
 * Closes inactive incidents and creates end notifications
 *
 * This function should be called periodically (e.g., by a CRON job) to:
 * 1. Find incidents that have been inactive for the threshold period
 * 2. Mark them as inactive
 * 3. Create end notifications
 *
 * @returns Number of incidents closed
 */
export async function closeInactiveIncidentsWithNotifications(): Promise<number> {
  try {
    const inactivityThresholdHours = parseInt(
      process.env.INCIDENT_RESOLUTION_HOURS || '6',
      10,
    );

    // Close inactive incidents
    const closedIncidents = await siteIncidentService.closeInactiveIncidents(
      inactivityThresholdHours,
    );

    // Create end notifications for each closed incident
    for (const incident of closedIncidents) {
      try {
        const notification =
          await notificationBoundaryService.createEndNotification(incident);

        if (notification) {
          // Record that the notification was created
          await notificationBoundaryService.recordNotificationSent(
            incident.id,
            'END',
            notification.id,
          );

          logger(
            `Created end notification for incident ${incident.id}`,
            'info',
          );
        }
      } catch (error) {
        logger(
          `Failed to create end notification for incident ${
            incident.id
          }: ${String(error)}`,
          'error',
        );
        // Continue processing other incidents
      }
    }

    logger(`Closed ${closedIncidents.length} inactive incidents`, 'info');
    return closedIncidents.length;
  } catch (error) {
    logger(`Failed to close inactive incidents: ${String(error)}`, 'error');
    throw error;
  }
}

/**
 * Example integration point for SiteAlert creation
 *
 * This shows how to integrate incident processing into the existing
 * SiteAlert creation flow. This would be added to the CreateSiteAlert service.
 *
 * @example
 * ```typescript
 * // After creating SiteAlert in CreateSiteAlert.ts:
 * const siteAlert = await prisma.siteAlert.create({ ... });
 *
 * // Process for incident tracking:
 * await processSiteAlertForIncident(siteAlert, geoEvent);
 * ```
 */
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
