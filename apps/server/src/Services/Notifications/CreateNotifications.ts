import {prisma} from '../../server/db';

// Logic in Prisma:
// Initialize an empty array → `notificationsToBeProcessed`
// Initialize an empty object →  `sitesActive` with type→ `{siteId1: Boolean, siteId2: Boolean, …}`
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
        // append the object `{siteAlertId, lastMessageCreated:site.lastMessageCreated, alertMethod: alertMethod.method, destination: alertMethod.destination}` to `notificationsToBeProcessed` array.
  // Append siteAlertId to `processedSiteAlerts` array

// For each `notificationsToBeProcessed`:
  // If alertMethod is “webhook” and “device”
    // Append create-notification object to `notificationsToBeCreated` array
  // If the alertMethod is “whatsapp”, “sms” or “email”
    // If `site.lastMessageCreated > 2 hours ago` 
      // `sitesActive["siteId"] == false`
    // If `site.lastMessageCreated < 2 hours ago OR is null` and `sitesActive["siteId"] == true`
      // Append create-notification object to `notificationsToBeCreated` array
      // `sitesActive[’siteId’] = false` // This makes the site inactive, meaning no more SMS WhatsApp or email for this site will be sent
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

const createNotifications = async () => {
  let totalSiteAlertProcessed = 0;
  try {
    // Initialize
    let notificationsToBeProcessed: NotificationToBeProcessed[] = [];
    let sitesActive: Record<string, boolean> = {};
    let processedSiteAlerts: string[] = [];
    let notificationsToBeCreated: NotificationToBeCreated[] = [];
    let sitesToBeUpdated: string[] = [];

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
    
    // Process each alert
    for (const alert of unprocessedAlerts) {
      const lastMessageCreated = alert.site.lastMessageCreated;
      const alertMethods = alert.site.user.alertMethods;

      if (alertMethods && alertMethods.length > 0) {
        alertMethods.forEach(alertMethod => {
          if (alertMethod.isVerified && alertMethod.isEnabled) {
            notificationsToBeProcessed.push({
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
    for (const notification of notificationsToBeProcessed) {
      const siteId = notification.siteId;
      
      // Check if the site is active or not
      // If sitesActive object has the siteId, then, use value from that, else check the value from the data from the database
      const siteActive = sitesActive[siteId] ?? (!notification.lastMessageCreated || new Date(notification.lastMessageCreated) < new Date(Date.now() - 2 * 60 * 60 * 1000));
      
      // Prepare createNotificationData object
      const createNotificationData: NotificationToBeCreated = {
        siteAlertId: notification.siteAlertId,
        alertMethod: notification.alertMethod,
        destination: notification.destination,
        isDelivered: false,
      };

      // If the alertMethod method is device or webhook, just create notification
      if (['device', 'webhook'].includes(notification.alertMethod)) {
        notificationsToBeCreated.push(createNotificationData);
      } 
      
      // ElseIf the alertMethod method is whatsapp, sms or email,
        // Then Check whether the site is active before creating notification and making the site inactive  
      else if (siteActive && ['whatsapp', 'sms', 'email'].includes(notification.alertMethod)) {
        notificationsToBeCreated.push(createNotificationData);
        // Make this site inactive
        sitesActive[siteId] = false;
        // Add siteId into the site to be updated list
        if (!sitesToBeUpdated.includes(siteId)) {
          sitesToBeUpdated.push(siteId);
        }
      }
    }
    
    // Run Prisma Transaction
    await prisma.$transaction(async (prisma) => {
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
    });

    // Update totalSiteAlertProcessed
    totalSiteAlertProcessed = processedSiteAlerts.length
  } catch (error) {
    console.log(error);
  }
  return totalSiteAlertProcessed;
};

export default createNotifications;
