import {Prisma} from '@prisma/client';
import {prisma} from '../../server/db';

// Logic
// Execute SQL

// 1. Join SiteAlert with alertMethod using site and userId: 
//     1. **get the oldest unique unprocessed alert for all sites**
//         1. Create notifications for alertMethods 
//             1. Create notifications for ‘device’ and ‘webhook’
//             2. if `site.lastMessageCreated = NULL` or `site.lastMessageCreated < 2 hours ago`create notifications for ‘sms’, ‘whatsapp’, and ‘email’
//                 1. set `site.lastMessageCreated = now`
// 2. For all processed siteAlerts , set `siteAlert.isProcessed` to true

// Repeat until nothing left to process

const createNotifications = async () => {
  let totalSiteAlertProcessed = 0;
  try {
      let moreAlertsToProcess = true;

      while(moreAlertsToProcess){
        const notificationCreationAndUpdate = Prisma.sql`
        WITH NotificationsForInsert AS (
          SELECT 
            a.id AS "siteAlertId", 
            m.method AS "alertMethod", 
            m.destination,
            a."siteId"
          FROM "AlertMethod" m
            INNER JOIN "Site" s ON s."userId" = m."userId" 
            INNER JOIN (
              SELECT DISTINCT ON ("siteId") *
              FROM "SiteAlert"
              WHERE "isProcessed" = false AND "deletedAt" IS NULL
              ORDER BY "siteId", "eventDate"
            ) a ON a."siteId" = s.id 
          WHERE 
            m."deletedAt" IS NULL 
            AND m."isEnabled" = true 
            AND m."isVerified" = true 
            AND (
              ((s."lastMessageCreated" IS NULL OR s."lastMessageCreated" < (CURRENT_TIMESTAMP - INTERVAL '2 hours')) AND m."method" IN ('sms', 'whatsapp', 'email')) 
              OR m."method" IN ('device', 'webhook')
            )
        ),
        InsertedNotifications AS (
          INSERT INTO "Notification" (id, "siteAlertId", "alertMethod", destination, "isDelivered")
          SELECT 
            gen_random_uuid(), 
            "siteAlertId", 
            "alertMethod", 
            destination, 
            false 
          FROM NotificationsForInsert
          RETURNING "siteAlertId", "alertMethod"
        ),
        UpdatedSites AS (
          UPDATE "Site"
          SET "lastMessageCreated" = CURRENT_TIMESTAMP
          WHERE "id" IN (
            SELECT "siteId" FROM NotificationsForInsert WHERE "alertMethod" IN ('sms', 'whatsapp', 'email')
          )
          RETURNING "id"
        )
        UPDATE "SiteAlert"
        SET "isProcessed" = true
        WHERE "id" IN (SELECT "siteAlertId" FROM InsertedNotifications);`;

        const siteAlertProcessed = await prisma.$executeRaw(notificationCreationAndUpdate);
        totalSiteAlertProcessed += siteAlertProcessed

        if(siteAlertProcessed === 0){
          // All notifications have been created, however, there might be some siteAlerts that are still unprocessed
          // This is because these siteAlerts do not have any associated enabled-alertMethod, so they were not considered by the SQL above
          // To address these unprocessed siteAlerts, update isProcessed for all remaining unprocessed siteAlerts to true
          const updateSiteAlertIsProcessedToTrue = Prisma.sql`
          UPDATE "SiteAlert" SET "isProcessed" = true WHERE "isProcessed" = false AND "deletedAt" IS NULL`;
          await prisma.$executeRaw(updateSiteAlertIsProcessedToTrue)
          // Exit the while loop          
          moreAlertsToProcess = false; // No more alerts to process, exit the loop
        }else {
          await new Promise(resolve => setTimeout(resolve, 200)); // Delay of 1/5 second
        }
      }
  } catch (error) {
    console.log(error);
  }
  return totalSiteAlertProcessed;
};

export default createNotifications;
