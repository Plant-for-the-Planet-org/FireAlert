import {prisma} from '../../server/db';

// Logic in Prisma:
// Initialize an empty array → `notificationDataQueue`
// Initialize an empty object →  `notificationMethodCounter` with type→ `{siteId1: Boolean, siteId2: Boolean, …}`
// Initialize an empty array → `processedSiteAlerts`
// Initialize an empty array → `notificationsToBeCreated`
// Initialize an empty array → `sitesToBeUpdated`
// Initialize an empty array → `siteAlertsToBeUpdated`

// Get all unprocessed alerts, Order them by siteId and eventDate, (eventDate must be oldest first)

// For each alert
  // Get the `site.lastMessageCreated` connected with this alert
  //Get all alertMethods connected with this alert
  //If there are more than 1 alertMethod:
    // For each alertMethod
      // If alertMethod.isVerified and alertMethod.isEnabled is true
        // append the object `{siteAlertId, lastMessageCreated:site.lastMessageCreated, alertMethod: alertMethod.method, destination: alertMethod.destination}` to `notificationDataQueue` array.
  // Append siteAlertId to `processedSiteAlerts` array

// For each `notificationDataQueue`:
  // If alertMethod is “webhook” and “device”
    // Append create-notification object to `notificationsToBeCreated` array
  // If the alertMethod is “whatsapp”, “sms” or “email”
    // If `site.lastMessageCreated > 2 hours ago` 
      // `notificationMethodCounter["siteId"] == false`
    // If `site.lastMessageCreated < 2 hours ago OR is null` and `notificationMethodCounter["siteId"] == true`
      // Append create-notification object to `notificationsToBeCreated` array
      // `notificationMethodCounter[’siteId’] = false` // This makes the site inactive, meaning no more SMS WhatsApp or email for this site will be sent
      // If siteId is not in sitesToBeUpdated array
        // Append siteId in `sitesToBeUpdated` array

// Run this Prisma Transaction:
  // Bulk update sites in `sitesToBeUpdated` as lastMessageCreated = now()
  // Bulk update siteAlerts in `processedSiteAlerts` as isProcessed = true
  // Bulk create notifications using `notificationsToBeCreated`  

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

//For all siteAlerts
  // Create notifications for [webhook, device]
  // We check if alerts happen within a certain time
  // If true
      // Only create notifications for [email, whatsapp, sms]
  // Mark the alert as processed

const createNotifications = async () => {
  let totalNotificationsCreated = 0;
  try {

    // Run Prisma Transaction
    await prisma.$transaction(async (prisma) => {

      //Get all unprocessed alerts
      const unprocessedAlerts = await prisma.siteAlert.findMany({
        where: { isProcessed: false, deletedAt: null },
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
                      isVerified: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [{ siteId: 'asc' }, { eventDate: 'asc' }]
      });
      
      let notificationDataQueue: NotificationToBeProcessed[] = [];
      // [email, whatsapp, and sms] method have one count for each unique alertMethod,
      // notificationMethodCounter keeps count for eligible notifications for each alertMethod method
      let notificationMethodCounter: Record<string, ActiveAlertMethodCount> = {};
      let processedSiteAlerts: string[] = [];
      let notificationsToBeCreated: NotificationToBeCreated[] = [];
      let sitesToBeUpdated: string[] = [];

      //Create a set of unique site IDs
      const uniqueSiteIdsForNewSiteAlerts = new Set(unprocessedAlerts.map(alert => alert.siteId));

      // Process each alert
      for (const alert of unprocessedAlerts) {
        const lastMessageCreated = alert.site.lastMessageCreated;
        const alertMethods = alert.site.user.alertMethods;
        const siteId = alert.siteId;

        // Initialize or update notificationMethodCounter for each unique site
        if (uniqueSiteIdsForNewSiteAlerts.has(siteId)) {
          // Initialize notificationMethodCounter for this site
          notificationMethodCounter[siteId] = { sms: 0, whatsapp: 0, email: 0, device: Infinity, webhook: Infinity };
          alertMethods.forEach(method => {
            if (method.isVerified && method.isEnabled) {
              notificationMethodCounter[siteId][method.method] += 1; // Increment the count of each method
            }
          });
          // Remove the siteId from the set
          uniqueSiteIdsForNewSiteAlerts.delete(siteId);
        }

        if (alertMethods && alertMethods.length > 0) {
          alertMethods.forEach(alertMethod => {
            if (alertMethod.isVerified && alertMethod.isEnabled) {
              notificationDataQueue.push({
                siteAlertId: alert.id,
                siteId: alert.siteId,
                lastMessageCreated,
                alertMethod: alertMethod.method,
                destination: alertMethod.destination
              });
            }
          });
        }
        processedSiteAlerts.push(alert.id);
      }

      // Create notifications based on conditions
      for (const notification of notificationDataQueue) {
        const siteId = notification.siteId;
        const method = notification.alertMethod

        // Determine if notification can be created
        // Check if the site is active or not, then check if the method count is sufficient
        const isSiteActive = !notification.lastMessageCreated || new Date(notification.lastMessageCreated) < new Date(Date.now() - 2 * 60 * 60 * 1000);
        const isMethodCountSufficient = notificationMethodCounter[siteId][method] > 0;
        const canCreateNotification = isSiteActive && isMethodCountSufficient;
        
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
      
          // Decrement the method count
          notificationMethodCounter[siteId][method] -= 1;
      
          // Add siteId to sitesToBeUpdated for methods other than device and webhook
          if (['sms', 'whatsapp', 'email'].includes(method) && !sitesToBeUpdated.includes(siteId)) {
            sitesToBeUpdated.push(siteId);
          }
        }
      }
      // Bulk update siteAlert to processed
      await prisma.siteAlert.updateMany({
        where: { id: { in: processedSiteAlerts } },
        data: { isProcessed: true }
      });
      // Bulk create notifications
      await prisma.notification.createMany({
        data: notificationsToBeCreated.map(n => ({
          siteAlertId: n.siteAlertId,
          alertMethod: n.alertMethod,
          destination: n.destination,
          isDelivered: false
        }))
      });
      // Bulk update sites.lastMessageCreated
      if (sitesToBeUpdated.length > 0) {
        await prisma.site.updateMany({
          where: { id: { in: sitesToBeUpdated } },
          data: { lastMessageCreated: new Date() }
        });
      }
      // Update totalNotificationsCreated
      totalNotificationsCreated = notificationsToBeCreated.length
    });
  } catch (error) {
    console.log(error);
  }
  return totalNotificationsCreated;
};

export default createNotifications;
