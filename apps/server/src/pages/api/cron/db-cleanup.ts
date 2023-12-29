// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/db-cleanup

import { type NextApiRequest, type NextApiResponse } from "next";
import { prisma } from '../../../server/db'
import { env } from "../../../env.mjs";
import { logger } from "../../../../src/server/logger";
import { sendAccountDeletionConfirmationEmail } from "../../../../src/utils/notification/userEmails";

// Run this cron every day once for max 60s.
export const config = {
    maxDuration: 300,
};

// Function to get unique values after combining two arrays
function getUniqueValuesInTwoArrays(array1:string[], array2:string[]) {
    const combinedArray = [...array1, ...array2];
    return Array.from(new Set(combinedArray));
}


// Function to update or create stats data
async function updateOrCreateStats(metric:string, count:number) {
    await prisma.stats.upsert({
        where: { metric: metric },
        update: { count: { increment: count } },
        create: {
            metric: metric,
            count: count,
            lastUpdated: new Date(),
        },
    });
}

// This cron will also help with GDPR compliance and data retention.

export default async function dbCleanup(req: NextApiRequest, res: NextApiResponse) {
    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        // Verify the 'cron_key' in the request headers
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized: Invalid Cron Key" });
            return;
        }
    }

    let total_delCount_user = 0;
    let total_delCount_site = 0;
    let total_delCount_alertMethod = 0;
    let total_delCount_siteAlert = 0;
    let total_delCount_notification = 0;
    let total_delCount_geoEvents = 0;
    let total_delCount_verificationRequest = 0;

    try {
        await prisma.$transaction(async (prisma) => {

            let userCleanupDeletion_Ids: string[] = [];
            let siteCleanupDeletion_Ids: string[] = [];
            let alertMethodCleanupDeletion_Ids: string[] = [];
        
            let alertMethodCascadeDeletion_Ids: string[] = [];
            let siteCascadeDeletion_Ids: string[] = [];

            // Getting users to be deleted with their associated alertMethods and sites
            const usersToBeDeleted = await prisma.user.findMany({
                where: {
                    deletedAt: {
                        lt: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
                    }
                },
                include: {
                    alertMethods: true,
                    sites: true
                }
            });

            // Process each user for deletion
            usersToBeDeleted.forEach(async user => {
                user.alertMethods.forEach(alertMethod => {
                    alertMethodCascadeDeletion_Ids.push(alertMethod.id);
                });
                const siteAlertPromises = user.sites.map(async site => {
                    siteCascadeDeletion_Ids.push(site.id);
            
                    // Counting cascade-deleted siteAlerts and notifications for each site
                    const siteAlerts = await prisma.siteAlert.findMany({
                        where: { siteId: site.id },
                        include: { notifications: true }
                    });
            
                    siteAlerts.forEach(siteAlert => {
                        total_delCount_siteAlert++;
                        total_delCount_notification += siteAlert.notifications.length;
                    });
                });
            
                await Promise.all(siteAlertPromises);

                // Adding user ID for deletion count
                userCleanupDeletion_Ids.push(user.id);
                sendAccountDeletionConfirmationEmail(user);
                logger(`USER DELETED: Sent account deletion confirmation email to ${user.id}`, 'info',);
            });

            // Fetching expired site and alertMethod IDs
            siteCleanupDeletion_Ids = (await prisma.site.findMany({
                where: { deletedAt: { lte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000) } },
                select: { id: true }
            })).map(site => site.id);

            alertMethodCleanupDeletion_Ids = (await prisma.alertMethod.findMany({
                where: { deletedAt: { lte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000) } },
                select: { id: true }
            })).map(am => am.id);

            total_delCount_site = getUniqueValuesInTwoArrays(siteCleanupDeletion_Ids, siteCascadeDeletion_Ids).length;
            total_delCount_alertMethod = getUniqueValuesInTwoArrays(alertMethodCleanupDeletion_Ids, alertMethodCascadeDeletion_Ids).length;


            // Calculating deletion counts
            total_delCount_user = userCleanupDeletion_Ids.length;
            
            // Performing user, site and alertMethod deletions
            await prisma.user.deleteMany({ where: { id: { in: userCleanupDeletion_Ids } } });
            await prisma.site.deleteMany({ where: { id: { in: siteCleanupDeletion_Ids } } });
            await prisma.alertMethod.deleteMany({ where: { id: { in: alertMethodCleanupDeletion_Ids } } });
            // Deleting old geoEvents and expired verificationRequests
            const deletedGeoEvents = await prisma.geoEvent.deleteMany({
                where: {
                    eventDate: {
                        lt: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
                    }
                }
            });
            total_delCount_geoEvents = deletedGeoEvents.count

            const deletedVeificationRequests = await prisma.verificationRequest.deleteMany({
                where: {
                    expires: {
                        lt: new Date()
                    }
                }
            });
            total_delCount_verificationRequest = deletedVeificationRequests.count

            // Update stats table
            await updateOrCreateStats('users_deleted', total_delCount_user);
            await updateOrCreateStats('sites_deleted', total_delCount_site);
            await updateOrCreateStats('alertMethods_deleted', total_delCount_alertMethod);
            await updateOrCreateStats('siteAlerts_deleted', total_delCount_siteAlert);
            await updateOrCreateStats('notifications_deleted', total_delCount_notification);
            await updateOrCreateStats('geoEvents_deleted', total_delCount_geoEvents);
            await updateOrCreateStats('verificationRequests_deleted', total_delCount_verificationRequest);
        });
        // End of Prisma Transaction

        // Logging deletion counts
        logger(`
            Deleted ${total_delCount_geoEvents} geo events
            Deleted ${total_delCount_user} users
            Deleted ${total_delCount_site} sites
            Deleted ${total_delCount_alertMethod} alert methods
            Deleted ${total_delCount_verificationRequest} expired verification requests
            Cascade Deleted ${total_delCount_siteAlert} site alerts
            Cascade Deleted ${total_delCount_notification} notifications
        `, 'info');

        res.status(200).json({
            message: "Success! Db is as clean as a whistle!",
            status: 200
        });
    } catch (error) {
        logger(`Something went wrong during cleanup. ${error}`, "error");
        res.status(500).json({
            message: "Something went wrong during cleanup.",
            status: 500
        });
    }
}