import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {TRPCError} from '@trpc/server';
import type {NotificationStatus} from '@prisma/client';

/**
 * Service for creating incident boundary notifications (START and END)
 * Processes unprocessed SiteIncidents and creates notifications for each verified and enabled alert method
 */

// Helper function to safely convert any to string
function ensureString(value: unknown): string {
  return String(value);
}

// Helper function to safely convert any to NotificationStatus
function ensureNotificationStatus(value: unknown): NotificationStatus {
  return value as NotificationStatus;
}

type NotificationQueueItem = {
  incidentId: string;
  siteId: string;
  notificationType: NotificationStatus;
  alertMethod: string;
  destination: string;
  siteAlertId: string;
};

type NotificationToBeCreated = {
  siteAlertId: string;
  alertMethod: string;
  destination: string;
  isDelivered: boolean;
  notificationStatus: NotificationStatus;
  metadata: {
    type: 'INCIDENT_START' | 'INCIDENT_END';
    incidentId: string;
    siteId: string;
    siteName: string;
    detectionCount?: number;
    durationMinutes?: number;
  };
};

type ActiveAlertMethodCount = Record<string, number>;

type AlertMethodInfo = {
  method: string;
  destination: string;
  isEnabled: boolean;
  isVerified: boolean;
};

type UserWithAlertMethods = {
  alertMethods: AlertMethodInfo[];
};

type SiteRelationWithUser = {
  user: UserWithAlertMethods;
};

type SiteWithRelations = {
  name: string | null;
  user: UserWithAlertMethods | null;
  siteRelations: SiteRelationWithUser[];
};

type UnprocessedIncident = {
  id: string;
  siteId: string;
  isActive: boolean;
  startSiteAlertId: string;
  startedAt: Date;
  endedAt: Date | null;
  site: SiteWithRelations;
  _count: {
    siteAlerts: number;
  };
};

/**
 * Creates nested chunks of unprocessed incidents for batch processing
 * Groups incidents by siteId to maintain consistency
 */
function createNestedChunksForUnprocessedIncidents(
  unprocessedIncidents: UnprocessedIncident[],
  approxChunkSize = 50,
): UnprocessedIncident[][] {
  const chunkedIncidentsNestedArray: UnprocessedIncident[][] = [];
  let currentSiteId = unprocessedIncidents[0]?.siteId;
  let nestedIndex = 0;

  unprocessedIncidents.forEach(incident => {
    if (!chunkedIncidentsNestedArray[nestedIndex]) {
      chunkedIncidentsNestedArray[nestedIndex] = [];
    }

    const currentChunk = chunkedIncidentsNestedArray[nestedIndex];
    const isNewSiteId = incident.siteId !== currentSiteId;
    const chunkFull = currentChunk.length >= approxChunkSize;
    const shouldCreateNewChunk = chunkFull && isNewSiteId;

    if (shouldCreateNewChunk) {
      nestedIndex++;
      currentSiteId = incident.siteId;
      chunkedIncidentsNestedArray[nestedIndex] = [incident];
    } else {
      currentChunk.push(incident);
    }
  });

  return chunkedIncidentsNestedArray;
}

/**
 * Processes a chunk of incidents and creates notification queue
 */
function processIncidentChunk(incidentChunk: UnprocessedIncident[]): {
  processedIncidents: string[];
  notificationCreateData: NotificationToBeCreated[];
} {
  const notificationDataQueue: NotificationQueueItem[] = [];
  const notificationMethodCounter: Record<string, ActiveAlertMethodCount> = {};
  const processedIncidents: string[] = [];
  const notificationsToBeCreated: NotificationToBeCreated[] = [];

  // Create a set of unique site IDs from unprocessed incidents
  const uniqueSiteIdsForNewIncidents = new Set(
    incidentChunk.map(incident => incident.siteId),
  );

  // Process each incident and add to notification queue
  for (const incident of incidentChunk) {
    const siteId_loop: string = incident.siteId;
    const alertMethods = incident.site.user?.alertMethods || [];
    const siteId = siteId_loop;

    // Initialize notificationMethodCounter for each unique site
    if (uniqueSiteIdsForNewIncidents.has(siteId)) {
      notificationMethodCounter[siteId] = {
        sms: 0,
        whatsapp: 0,
        email: 0,
        device: 0,
        webhook: 0,
      };

      alertMethods.forEach(method => {
        if (method.isVerified && method.isEnabled) {
          notificationMethodCounter[siteId][method.method] += 1;
        }
      });

      uniqueSiteIdsForNewIncidents.delete(siteId);
    }

    // Determine notification type based on incident state
    const notificationType: NotificationStatus = incident.isActive
      ? ('START_SCHEDULED' as const)
      : ('END_SCHEDULED' as const);

    // Add notifications to queue for each verified and enabled alert method
    if (alertMethods && alertMethods.length > 0) {
      alertMethods.forEach(alertMethod => {
        if (alertMethod.isVerified && alertMethod.isEnabled) {
          const method_typed: string = ensureString(alertMethod.method);
          const destination_typed: string = ensureString(
            alertMethod.destination,
          );
          const incidentId_typed: string = ensureString(incident.id);
          const siteId_typed: string = ensureString(incident.siteId);
          const startSiteAlertId_typed: string = ensureString(
            incident.startSiteAlertId,
          );
          const queueItem: NotificationQueueItem = {
            incidentId: incidentId_typed,
            siteId: siteId_typed,
            notificationType,
            alertMethod: method_typed,
            destination: destination_typed,
            siteAlertId: startSiteAlertId_typed,
          };
          notificationDataQueue.push(queueItem);
        }
      });
    }

    const incident_id: string = incident.id;
    processedIncidents.push(incident_id);
  }

  // Create notifications based on method availability
  for (const notification of notificationDataQueue) {
    const siteId_notif: string = notification.siteId;
    const siteId = siteId_notif;
    const method_notif: string = notification.alertMethod;
    const method: string = method_notif;

    // Check if method count is sufficient
    const isMethodCountSufficient =
      notificationMethodCounter[siteId][method] > 0;

    if (isMethodCountSufficient) {
      // Find the incident to get metadata
      const incident = incidentChunk.find(
        i => i.id === notification.incidentId,
      );
      if (!incident) continue;

      // Calculate duration for END notifications
      let durationMinutes: number | undefined;
      if (!incident.isActive && incident.endedAt) {
        durationMinutes = Math.floor(
          (incident.endedAt.getTime() - incident.startedAt.getTime()) /
            (1000 * 60),
        );
      }

      // Prepare notification data
      const incidentMetadata = {
        type:
          notification.notificationType === 'START_SCHEDULED'
            ? ('INCIDENT_START' as const)
            : ('INCIDENT_END' as const),
        incidentId: notification.incidentId,
        siteId: notification.siteId,
        siteName: incident.site.name || 'Unknown Site',
        detectionCount: incident._count.siteAlerts,
        durationMinutes,
      } satisfies NotificationToBeCreated['metadata'];

      const siteAlertId_typed: string = ensureString(notification.siteAlertId);
      const destination_notification: string = ensureString(
        notification.destination,
      );
      const notificationType_typed: NotificationStatus =
        ensureNotificationStatus(notification.notificationType);
      const createNotificationData: NotificationToBeCreated = {
        siteAlertId: siteAlertId_typed,
        alertMethod: method,
        destination: destination_notification,
        isDelivered: false,
        notificationStatus: notificationType_typed,
        metadata: incidentMetadata,
      };

      notificationsToBeCreated.push(createNotificationData);
      notificationMethodCounter[siteId][method] -= 1;
    }
  }

  return {
    processedIncidents,
    notificationCreateData: notificationsToBeCreated,
  };
}

/**
 * Main function to create incident boundary notifications
 * Processes all unprocessed SiteIncidents and creates notifications
 *
 * @returns Number of notifications created
 */
export async function createIncidentNotifications(): Promise<number> {
  let totalNotificationsCreated = 0;

  try {
    logger('Starting incident notification creation', 'info');

    // Get all unprocessed incidents
    const queryResults = await prisma.siteIncident.findMany({
      where: {
        isProcessed: false,
      },
      select: {
        id: true,
        siteId: true,
        isActive: true,
        startSiteAlertId: true,
        startedAt: true,
        endedAt: true,
        site: {
          select: {
            name: true,
            user: {
              select: {
                alertMethods: {
                  select: {
                    method: true,
                    destination: true,
                    isEnabled: true,
                    isVerified: true,
                  },
                },
              },
            },
            siteRelations: {
              select: {
                user: {
                  select: {
                    alertMethods: {
                      select: {
                        method: true,
                        destination: true,
                        isEnabled: true,
                        isVerified: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            siteAlerts: true,
          },
        },
      },
      orderBy: [{siteId: 'asc'}, {startedAt: 'asc'}],
    });

    const unprocessedIncidents: UnprocessedIncident[] = queryResults.map(
      result => ({
        id: result.id,
        siteId: result.siteId,
        isActive: result.isActive,
        startSiteAlertId: result.startSiteAlertId,
        startedAt: result.startedAt,
        endedAt: result.endedAt,
        site: {
          name: result.site.name,
          user: result.site.user,
          siteRelations: result.site.siteRelations,
        },
        _count: result._count,
      }),
    );

    // Handle protected sites (where site.user is null)
    const processedIncidents = unprocessedIncidents.map(incident => {
      if (!incident.site.user) {
        return {
          ...incident,
          site: {
            ...incident.site,
            user: {
              alertMethods: incident.site.siteRelations.flatMap(
                sr => sr.user.alertMethods,
              ),
            },
          },
        };
      }
      return incident;
    });

    logger(`Found ${processedIncidents.length} unprocessed incidents`, 'info');

    // Process incidents in chunks
    const incidentsInChunks = createNestedChunksForUnprocessedIncidents(
      processedIncidents,
      30,
    );

    for (const incidentChunk of incidentsInChunks) {
      const {processedIncidents, notificationCreateData} =
        processIncidentChunk(incidentChunk);

      // Execute transaction to update incidents and create notifications
      await prisma.$transaction(async tx => {
        // Mark incidents as processed
        await tx.siteIncident.updateMany({
          where: {id: {in: processedIncidents}},
          data: {isProcessed: true},
        });

        // Create notifications
        if (notificationCreateData.length > 0) {
          await tx.notification.createMany({
            data: notificationCreateData,
          });
        }
      });

      totalNotificationsCreated += notificationCreateData.length;
      logger(
        `Created ${notificationCreateData.length} notifications for chunk`,
        'info',
      );
    }

    logger(
      `Completed incident notification creation. Total: ${totalNotificationsCreated}`,
      'info',
    );

    return totalNotificationsCreated;
  } catch (error) {
    logger(
      `Failed to create incident notifications: ${String(error)}`,
      'error',
    );
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create incident notifications',
      cause: error,
    });
  }
}

export default createIncidentNotifications;
