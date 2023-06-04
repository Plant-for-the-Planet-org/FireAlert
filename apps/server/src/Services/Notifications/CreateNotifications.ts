import { Prisma, PrismaClient } from "@prisma/client";
import notificationEmitter from "../../Events/EventEmitter/NotificationEmitter";
import { NOTIFICATION_SENT } from "../../Events/messageConstants";
const prisma = new PrismaClient();

const createNotifications = async () => {
    try {
        debugger;
        // In this query, the subquery retrieves all enabled and verified AlertMethods (m) for the user associated with the site. 
        // Then, a cross join is performed between the SiteAlert table (a) and the AlertMethod subquery (m), ensuring that each siteAlert is paired with all relevant alertMethods.
        const notificationCreationQuery = Prisma.sql`
        INSERT INTO "Notification" (id, "siteAlertId", "alertMethod", destination, "isDelivered") 
        SELECT gen_random_uuid(), a.id, m.method, m.destination, false 
            FROM "SiteAlert" a 
                INNER JOIN "Site" s ON a."siteId" = s.id 
                INNER JOIN "AlertMethod" m ON m."userId" = s."userId" 
                    WHERE a."isProcessed" = false AND a."deletedAt" IS NULL AND m."isEnabled" = true AND m."isVerified" = true`;

        const updateSiteAlertIsProcessedToTrue = Prisma.sql`UPDATE "SiteAlert" SET "isProcessed" = true WHERE "isProcessed" = false AND "deletedAt" IS NULL`;

        // Create Notifications for all unprocessed SiteAlerts
        await prisma.$executeRaw(notificationCreationQuery);

        // Set all SiteAlert as processed
        await prisma.$executeRaw(updateSiteAlertIsProcessedToTrue);
        debugger;
    } catch (error) {
        console.log(error)
    }
    notificationEmitter.emit(NOTIFICATION_SENT)
}

export default createNotifications;