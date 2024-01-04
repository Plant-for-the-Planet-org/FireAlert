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
const MAX_DURATION = (config.maxDuration)*1000 - 10000

// Function to get unique values after combining two arrays
function getUniqueValuesInTwoArrays(array1: string[], array2: string[]) {
    const combinedArray = [...array1, ...array2];
    return Array.from(new Set(combinedArray));
}

// Function to update or create stats data
async function updateOrCreateStats(metric: string, count: number) {
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

// Function to delete geoEvents in batches and update stats
async function deleteGeoEventsBatch(startTime: number) {
    const batchSize = 1000;
    let totalDeleted = 0; // Variable to keep track of the total deleted count

    while (true) {
        // Exit the process if serverless maxDuration is approaching
        const beforeDeletionTime = Date.now();
        if (beforeDeletionTime - startTime > MAX_DURATION) {
            logger("Db-Cleanup Approaching max duration. Exiting geoEvent_deletion early.", "info");
            break;
        }
        // Fetch the IDs of the geoEvents to be deleted outside the transaction
        const geoEventsToDelete = await prisma.geoEvent.findMany({
            where: {
                eventDate: {
                    lt: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
                }
            },
            take: batchSize,
            select: { id: true }
        });

        const deleteCount = geoEventsToDelete.length;
        if (deleteCount === 0) {
            break; // Exit the loop if no more records to delete
        }

        // Perform the deletion and stats update inside a transaction
        await prisma.$transaction(async (prisma) => {
            await prisma.geoEvent.deleteMany({
                where: { id: { in: geoEventsToDelete.map(event => event.id) } }
            });

            await updateOrCreateStats('geoEvents_deleted', deleteCount);
        });

        // Update the total deleted count
        totalDeleted += deleteCount;

        // Break the loop if less than batchSize records were deleted (no more batches)
        if (deleteCount < batchSize) {
            break;
        }

        // Exit the process if serverless maxDuration is approaching
        const afterDeletionTime = Date.now();
        if (afterDeletionTime - startTime > MAX_DURATION) {
            logger("Db-Cleanup Approaching max duration. Exiting geoEvent_deletion early.", "info");
            break;
        }
    }
    logger(`Deleted ${totalDeleted} geo events`, 'info');
    return totalDeleted; // Return the total number of deleted geoEvents
}

async function deleteVerificationRequests() {
    const deletedVerificationRequests = await prisma.verificationRequest.deleteMany({
        where: {
            expires: {
                lt: new Date()
            }
        }
    });
    logger(`Deleted ${deletedVerificationRequests.count} expired verification requests`, 'info');
    return deletedVerificationRequests.count;
}

async function cleanup_User_Site_AlertMethod_SiteAlert_and_Notification() {
    let total_delCount_user = 0;
    let total_delCount_site = 0;
    let total_delCount_alertMethod = 0;
    let total_delCount_siteAlert = 0;
    let total_delCount_notification = 0;

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
        select: {
            id: true,
            email: true,
            name: true,
            alertMethods: {
                select: {
                    id: true
                }
            },
            sites: {
                select: {
                    id: true
                }
            }
        }
    });

    // Process each user for deletion
    for (const user of usersToBeDeleted) {
        user.alertMethods.forEach(alertMethod => {
            alertMethodCascadeDeletion_Ids.push(alertMethod.id);
        });

        const siteAlertPromises = user.sites.map(async site => {
            siteCascadeDeletion_Ids.push(site.id);

            // Counting cascade-deleted siteAlerts and notifications for each site
            const siteAlerts = await prisma.siteAlert.findMany({
                where: { siteId: site.id },
                select: {
                    id: true,
                    notifications: {
                        select: {
                            id: true
                        }
                    }
                }
            });

            let siteAlertCount = 0;
            let notificationCount = 0;
            siteAlerts.forEach(siteAlert => {
                siteAlertCount++;
                notificationCount += siteAlert.notifications.length;
            });
            return { siteAlertCount, notificationCount };
        });

        const siteAlertResults = await Promise.all(siteAlertPromises);
        siteAlertResults.forEach(result => {
            total_delCount_siteAlert += result.siteAlertCount;
            total_delCount_notification += result.notificationCount;
        });

        // Adding user ID for deletion count
        userCleanupDeletion_Ids.push(user.id);
        const name = user.name || ""
        sendAccountDeletionConfirmationEmail(user.email, name);
        logger(`USER DELETED: Sent account deletion confirmation email to ${user.id}`, 'info',);
    }

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

    // Run all process of Performing user, site and alertMethod deletions, and updating stats table  in a transcation
    await prisma.$transaction(async (prisma) => {
        // Deleting records
        await prisma.user.deleteMany({ where: { id: { in: userCleanupDeletion_Ids } } });
        await prisma.site.deleteMany({ where: { id: { in: siteCleanupDeletion_Ids } } });
        await prisma.alertMethod.deleteMany({ where: { id: { in: alertMethodCleanupDeletion_Ids } } });

        // Updating del_count in stats table
        await updateOrCreateStats('users_deleted', total_delCount_user);
        await updateOrCreateStats('sites_deleted', total_delCount_site);
        await updateOrCreateStats('siteAlerts_deleted', total_delCount_siteAlert);
        await updateOrCreateStats('notifications_deleted', total_delCount_notification);
    });
    // End of transaction
    // Logging deletions:
    logger(`
        Deleted ${total_delCount_user} users
        Deleted ${total_delCount_site} sites
        Deleted ${total_delCount_alertMethod} alert methods
        Cascade Deleted ${total_delCount_siteAlert} site alerts
        Cascade Deleted ${total_delCount_notification} notifications
    `, 'info');
}

async function cleanUsers() {
    let total_delCount_user = 0;
    let total_delCount_site = 0;
    let total_delCount_alertMethod = 0;
    let total_delCount_siteAlert = 0;
    let total_delCount_notification = 0;

    let userCleanupDeletion_Ids: string[] = [];
    let alertMethodCascadeDeletion_Ids: string[] = [];
    let siteCascadeDeletion_Ids: string[] = [];

    // Getting users to be deleted with their associated alertMethods and sites
    const usersToBeDeleted = await prisma.user.findMany({
        where: {
            deletedAt: {
                lt: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
            }
        },
        select: {
            id: true,
            email: true,
            name: true,
            alertMethods: {
                select: {
                    id: true
                }
            },
            sites: {
                select: {
                    id: true
                }
            }
        }
    });

    // Process each user for deletion
    for (const user of usersToBeDeleted) {
        user.alertMethods.forEach(alertMethod => {
            alertMethodCascadeDeletion_Ids.push(alertMethod.id);
        });

        const siteAlertPromises = user.sites.map(async site => {
            siteCascadeDeletion_Ids.push(site.id);

            // Counting cascade-deleted siteAlerts and notifications for each site
            const siteAlerts = await prisma.siteAlert.findMany({
                where: { siteId: site.id },
                select: {
                    id: true,
                    notifications: {
                        select: {
                            id: true
                        }
                    }
                }
            });

            let siteAlertCount = 0;
            let notificationCount = 0;
            siteAlerts.forEach(siteAlert => {
                siteAlertCount++;
                notificationCount += siteAlert.notifications.length;
            });
            return { siteAlertCount, notificationCount };
        });

        const siteAlertResults = await Promise.all(siteAlertPromises);
        siteAlertResults.forEach(result => {
            total_delCount_siteAlert += result.siteAlertCount;
            total_delCount_notification += result.notificationCount;
        });

        // Adding user ID for deletion count
        userCleanupDeletion_Ids.push(user.id);
        const name = user.name || ""
        sendAccountDeletionConfirmationEmail(user.email, name);
        logger(`USER DELETED: Sent account deletion confirmation email to ${user.id}`, 'info',);
    }
    // Calculating deletion counts
    total_delCount_user = userCleanupDeletion_Ids.length;
    total_delCount_site = siteCascadeDeletion_Ids.length;
    total_delCount_alertMethod = alertMethodCascadeDeletion_Ids.length;
    // Run all process of Performing user, site and alertMethod deletions, and updating stats table  in a transcation
    await prisma.$transaction(async (prisma) => {
        // Deleting users
        await prisma.user.deleteMany({ where: { id: { in: userCleanupDeletion_Ids } } });
        // Updating del_count in stats table
        await updateOrCreateStats('users_deleted', total_delCount_user);
        await updateOrCreateStats('sites_deleted', total_delCount_site);
        await updateOrCreateStats('siteAlerts_deleted', total_delCount_siteAlert);
        await updateOrCreateStats('notifications_deleted', total_delCount_notification);
    });
    // End of transaction
    // Logging deletions:
    logger(`
        Deleted ${total_delCount_user} users
        Cascade Deleted ${total_delCount_site} sites
        Cascade Deleted ${total_delCount_alertMethod} alert methods
        Cascade Deleted ${total_delCount_siteAlert} site alerts
        Cascade Deleted ${total_delCount_notification} notifications
    `, 'info');
}

async function cleanSites(){
    let total_delCount_site = 0;
    let total_delCount_siteAlert = 0;
    let total_delCount_notification = 0;

    let siteCleanupDeletion_Ids: string[] = [];

    siteCleanupDeletion_Ids = (await prisma.site.findMany({
        where: { deletedAt: { lte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000) } },
        select: { id: true }
    })).map(site => site.id);

    // Process each site for deletion
    for (const siteId of siteCleanupDeletion_Ids) {
        // Counting cascade-deleted siteAlerts and notifications for each site
        const siteAlerts = await prisma.siteAlert.findMany({
            where: { siteId: siteId },
            select: {
                id: true,
                notifications: {
                    select: {
                        id: true
                    }
                }
            }
        });

        let siteAlertCount = 0;
        let notificationCount = 0;
        siteAlerts.forEach(siteAlert => {
            siteAlertCount++;
            notificationCount += siteAlert.notifications.length;
        });
        total_delCount_siteAlert += siteAlertCount;
        total_delCount_notification += notificationCount;
    }
    // Calculating deletion counts
    total_delCount_site = siteCleanupDeletion_Ids.length;

    // Run all process of Performing user, site and alertMethod deletions, and updating stats table  in a transcation
    await prisma.$transaction(async (prisma) => {
        // Deleting records
        await prisma.site.deleteMany({ where: { id: { in: siteCleanupDeletion_Ids } } });

        // Updating del_count in stats table
        await updateOrCreateStats('sites_deleted', total_delCount_site);
        await updateOrCreateStats('siteAlerts_deleted', total_delCount_siteAlert);
        await updateOrCreateStats('notifications_deleted', total_delCount_notification);
    });
    // End of transaction
    // Logging deletions:
    logger(`
        Deleted ${total_delCount_site} sites
        Cascade Deleted ${total_delCount_siteAlert} site alerts
        Cascade Deleted ${total_delCount_notification} notifications
    `, 'info');
}

async function cleanAlertMethods(){
    const deletedAlertMethods = await prisma.alertMethod.deleteMany({
        where: { deletedAt: { lte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000) } },
    });
    logger(`Deleted ${deletedAlertMethods.count} alertMethods`, 'info');
    return deletedAlertMethods.count;
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
    const startTime = Date.now()

    // What is to be cleaned
    const validCleanupOptions = ['geoEvent', 'verificationRequest', 'user', 'site', 'alertMethod'];

    // Extract the 'clean' parameter from the request query
    const tableToClean = req.query['clean'] as string;

    try {
        if (validCleanupOptions.includes(tableToClean)) {
            // Execute specific cleanup based on the provided option
            switch(tableToClean){
                case 'geoEvent':
                    const geoEventsDeleted = await deleteGeoEventsBatch(startTime)
                    res.status(200).json({message: `Successfully deleted ${geoEventsDeleted} geo events`});
                    break;
                case 'verificationRequest':
                    const verificationRequestsDeleted = await deleteVerificationRequests()
                    res.status(200).json({message: `Successfully deleted ${verificationRequestsDeleted} verification requests`});
                    break;
                case 'user':
                    await cleanUsers()
                    res.status(200).json({message: `Successfully cleaned up users`});
                    break;
                case 'site':
                    await cleanSites()
                    res.status(200).json({message: `Successfully cleaned up users`});
                    break;
                case 'alertMethod':
                    const alertMethodDeleted = await cleanAlertMethods()
                    res.status(200).json({message: `Successfully deleted ${alertMethodDeleted} verification requests`});
                    break;
                default: 
                    // This should not be reached due to the includes check above
                    throw new Error(`Invalid cleanup option: ${tableToClean}`);
            }
        }else{
            // Default case: Execute all cleanups if no specific table is specified or if an invalid option is given
            let promises = [];
            promises.push(deleteGeoEventsBatch(startTime));
            promises.push(cleanup_User_Site_AlertMethod_SiteAlert_and_Notification());
            promises.push(deleteVerificationRequests());
            // Execute all promises and use TypeScript type assertions
            await Promise.all(promises);
            res.status(200).json({
                message: "Success! Db is as clean as a whistle!",
                status: 200
            });
        }
    } catch (error) {
        logger(`Something went wrong during cleanup. ${error}`, "error");
        res.status(500).json({
            message: "Something went wrong during cleanup.",
            status: 500
        });
    }
}