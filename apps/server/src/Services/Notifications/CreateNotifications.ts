import { Prisma } from "@prisma/client";
import { prisma } from '../../server/db'

const createNotifications = async () => {
    let notificationsCreated = 0;
    try {
        // In this query, the subquery retrieves all enabled and verified AlertMethods (m) for the user associated with the site. 
        // Then, a cross join is performed between the SiteAlert table (a) and the AlertMethod subquery (m), ensuring that each siteAlert is paired with all relevant alertMethods.
        const notificationCreationQuery = Prisma.sql`
        INSERT INTO "Notification" (id, "siteAlertId", "alertMethod", destination, "isDelivered") 
        SELECT gen_random_uuid(), a.id, m.method, m.destination, false 
            FROM "SiteAlert" a 
                INNER JOIN "Site" s ON a."siteId" = s.id 
                INNER JOIN "AlertMethod" m ON m."userId" = s."userId" 
                    WHERE a."isProcessed" = false AND a."deletedAt" IS NULL AND m."deletedAt" IS NULL AND m."isEnabled" = true AND m."isVerified" = true AND a."eventDate" > CURRENT_TIMESTAMP - INTERVAL '24 hours'`;

        const updateSiteAlertIsProcessedToTrue = Prisma.sql`UPDATE "SiteAlert" SET "isProcessed" = true WHERE "isProcessed" = false AND "deletedAt" IS NULL`;

        // Create Notifications for all unprocessed SiteAlerts and Set all SiteAlert as processed
        const results = await prisma.$transaction([
            prisma.$executeRaw(notificationCreationQuery),
            prisma.$executeRaw(updateSiteAlertIsProcessedToTrue)
        ]);
        // Since $executeRaw() returns the number of rows affected, the first result of the transaction would be notificationsCreated
        notificationsCreated = results[0];

    } catch (error) {
        console.log(error)
    }
    return notificationsCreated;
}

export default createNotifications;