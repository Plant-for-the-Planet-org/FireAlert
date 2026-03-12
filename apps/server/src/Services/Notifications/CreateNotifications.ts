import {prisma} from '../../server/db';
import {CustomError} from '../../utils/errorHandler';
import {logger} from '../../server/logger';
import {isSiteAlertMethod} from './NotificationRoutingConfig';

type NotificationToBeProcessed = {
  siteAlertId: string;
  siteId: string;
  lastMessageCreated: Date | null;
  alertMethod: string;
  destination: string;
};

type NotificationToBeCreated = {
  siteAlertId: string;
  alertMethod: string;
  destination: string;
  isDelivered: boolean;
};

type ActiveAlertMethodCount = {
  sms: number;
  whatsapp: number;
  email: number;
  [key: string]: number;
};

type AlertMethodData = {
  method: string;
  destination: string;
  isEnabled: boolean;
  isVerified: boolean;
};

type UserAlertMethods = {
  alertMethods: AlertMethodData[];
};

type SiteAlertRelations = {
  lastMessageCreated: Date | null;
  user: UserAlertMethods | null;
};

type UnprocessedSiteAlert = {
  id: string;
  siteId: string;
  site: SiteAlertRelations;
};

function createNestedChunksForUnprocessedSiteAlerts(
  unprocessedSiteAlerts: UnprocessedSiteAlert[],
  approxChunkSize = 50,
): UnprocessedSiteAlert[][] {
  const chunkedSiteAlertsNestedArray: UnprocessedSiteAlert[][] = [];
  let currentSiteId = unprocessedSiteAlerts[0]?.siteId;
  let nestedIndex = 0;

  unprocessedSiteAlerts.forEach(siteAlert => {
    if (!chunkedSiteAlertsNestedArray[nestedIndex]) {
      chunkedSiteAlertsNestedArray[nestedIndex] = [];
    }

    const currentChunk = chunkedSiteAlertsNestedArray[nestedIndex];
    const isNewSiteId = siteAlert.siteId !== currentSiteId;
    const chunkFull = currentChunk.length >= approxChunkSize;
    const shouldCreateNewChunk = chunkFull && isNewSiteId;

    if (shouldCreateNewChunk) {
      nestedIndex++;
      currentSiteId = siteAlert.siteId;
      chunkedSiteAlertsNestedArray[nestedIndex] = [siteAlert];
    } else {
      currentChunk.push(siteAlert);
    }
  });
  return chunkedSiteAlertsNestedArray;
}

type ProcessSiteAlertChunkResult = {
  processedSiteAlerts: string[];
  notificationCreateData: NotificationToBeCreated[];
};

function processSiteAlertChunk(
  siteAlertChunk: UnprocessedSiteAlert[],
): ProcessSiteAlertChunkResult {
  const notificationDataQueue: NotificationToBeProcessed[] = [];
  // [email, whatsapp, and sms] method have one count for each unique alertMethod,
  // notificationMethodCounter keeps count for eligible notifications for each alertMethod method
  const notificationMethodCounter: Record<string, ActiveAlertMethodCount> = {};
  const processedSiteAlerts: string[] = [];
  const notificationsToBeCreated: NotificationToBeCreated[] = [];
  // Create a set of unique site IDs from unprocessed alerts
  const uniqueSiteIdsForNewSiteAlerts = new Set(
    siteAlertChunk.map(alert => alert.siteId),
  );

  // Process each siteAlert, and add to notificationQueue
  for (const siteAlert of siteAlertChunk) {
    const lastMessageCreated = siteAlert.site.lastMessageCreated;
    const alertMethods = siteAlert.site.user?.alertMethods ?? [];
    const siteId = siteAlert.siteId;

    // Initialize or update notificationMethodCounter for each unique site
    if (uniqueSiteIdsForNewSiteAlerts.has(siteId)) {
      // Initialize notificationMethodCounter for this site
      notificationMethodCounter[siteId] = {
        sms: 0,
        whatsapp: 0,
        email: 0,
        device: Infinity,
        webhook: Infinity,
      };
      alertMethods.forEach(method => {
        if (
          method.isVerified &&
          method.isEnabled &&
          isSiteAlertMethod(method.method)
        ) {
          notificationMethodCounter[siteId][method.method] += 1; // Increment the count of each method
        }
      });
      // Remove the siteId from the set
      uniqueSiteIdsForNewSiteAlerts.delete(siteId);
    }

    if (alertMethods && alertMethods.length > 0) {
      alertMethods.forEach(alertMethod => {
        if (
          alertMethod.isVerified &&
          alertMethod.isEnabled &&
          isSiteAlertMethod(alertMethod.method)
        ) {
          notificationDataQueue.push({
            siteAlertId: siteAlert.id,
            siteId: siteAlert.siteId,
            lastMessageCreated,
            alertMethod: alertMethod.method,
            destination: alertMethod.destination,
          });
        }
      });
    }
    processedSiteAlerts.push(siteAlert.id);
  }

  // Create notifications based on conditions
  for (const notification of notificationDataQueue) {
    const siteId = notification.siteId;
    const method = notification.alertMethod;

    // For SiteAlert methods (device, webhook), always create notifications (no rate limiting)
    const canCreateNotification = true;

    if (canCreateNotification) {
      // Prepare createNotificationData object
      const createNotificationData: NotificationToBeCreated = {
        siteAlertId: notification.siteAlertId,
        alertMethod: method,
        destination: notification.destination,
        isDelivered: false,
      };

      // Add to notificationsToBeCreated array
      notificationsToBeCreated.push(createNotificationData);

      // Decrement the method count (for consistency, though not used for rate limiting)
      notificationMethodCounter[siteId][method] -= 1;
    }
  }
  const notificationCreateData = notificationsToBeCreated.map(n => ({
    siteAlertId: n.siteAlertId,
    alertMethod: n.alertMethod,
    destination: n.destination,
    isDelivered: false,
  }));
  return {
    processedSiteAlerts,
    notificationCreateData,
  };
}

const createNotifications = async () => {
  let totalNotificationsCreated = 0;
  try {
    logger(
      'Starting CreateNotifications for SiteAlert methods (device, webhook) only',
      'debug',
    );

    //Get all unprocessed alerts
    const unprocessedAlerts = await prisma.siteAlert.findMany({
      where: {
        isProcessed: false,
        deletedAt: null,
        eventDate: {
          gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Alerts from the last 24 hours
        },
      },
      select: {
        id: true,
        siteId: true,
        site: {
          select: {
            lastMessageCreated: true,
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
      },
      orderBy: [{siteId: 'asc'}, {eventDate: 'asc'}],
    });

    const processedAlerts = unprocessedAlerts.map(el => {
      if (!el.site.user) {
        // site.user would be null for protected-sites
        // siteRelation may have multiple user, flatmap all user's alertMethods & adding to user.alertMethods so further functionality can detect further
        return {
          ...el,
          site: {
            ...el.site,
            user: {
              alertMethods: el.site.siteRelations.flatMap(
                sr => sr.user.alertMethods,
              ),
            },
          },
        };
      }
      return el;
    });

    const siteAlertsInChunks = createNestedChunksForUnprocessedSiteAlerts(
      processedAlerts,
      30,
    );
    for (const siteAlertChunk of siteAlertsInChunks) {
      const {processedSiteAlerts, notificationCreateData} =
        processSiteAlertChunk(siteAlertChunk);
      await prisma.$transaction(async prisma => {
        await prisma.siteAlert.updateMany({
          where: {id: {in: processedSiteAlerts}},
          data: {isProcessed: true},
        });
        await prisma.notification.createMany({
          data: notificationCreateData,
        });
      });
      totalNotificationsCreated =
        totalNotificationsCreated + notificationCreateData.length;
    }
  } catch (error) {
    const {status, message} = error as {status: number; message: string};
    CustomError.throw(status, message, 'GeneralError', true);
  }
  logger(
    `CreateNotifications completed. Created ${totalNotificationsCreated} SiteAlert notifications (device, webhook methods only)`,
    'debug',
  );
  return totalNotificationsCreated;
};

export default createNotifications;
