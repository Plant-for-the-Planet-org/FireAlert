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
// Set up max duration dynamically to gracefully stop deletion before serverless timeout
const MAX_DURATION = (config.maxDuration) * 1000 - 20000

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
            logger("Db-Cleanup Approaching max duration. Exiting geoEvent cleanup early.", "info");
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
            logger("Db-Cleanup Approaching max duration. Exiting geoEvent cleanup early.", "info");
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

async function cleanUsers(startTime: number) {
    let continueDeletion = true;

    // Counters for each entity
    let countUsers = 0;
    let countSites = 0;
    let countAlertMethods = 0;
    let countSiteAlerts = 0;
    let countNotifications = 0;

    // Find all users for deletion along with their alertMethods and sites
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
            alertMethods: { select: { id: true } },
            sites: { select: { id: true } }
        }
    });

    for (const user of usersToBeDeleted) {
        if (!continueDeletion) break;

        // Delete all alertMethods for the user
        const alertMethodIds = user.alertMethods.map(am => am.id);
        if (alertMethodIds.length > 0) {
            await prisma.alertMethod.deleteMany({ where: { id: { in: alertMethodIds } } });
            countAlertMethods += alertMethodIds.length;
        }

        const siteIds = user.sites.map(s => s.id)

        for (const siteId of siteIds) {
            let notificationIds: string[] = [];
            let siteAlertIds: string[] = [];

            // For each site, find all siteAlerts and associated notifications
            while (true) {
                const siteAlerts = await prisma.siteAlert.findMany({
                    where: { siteId: siteId },
                    select: {
                        id: true,
                        notifications: { select: { id: true } }
                    }
                });

                if (siteAlerts.length === 0) break;

                for (const siteAlert of siteAlerts) {
                    siteAlertIds.push(siteAlert.id);
                    notificationIds.push(...siteAlert.notifications.map(n => n.id));
                }
                if (notificationIds.length > 0) {
                    await prisma.notification.deleteMany({ where: { id: { in: notificationIds } } });
                    await updateOrCreateStats('notifications_deleted', notificationIds.length);
                    countNotifications += notificationIds.length;
                }
                if (siteAlertIds.length > 0) {
                    await prisma.siteAlert.deleteMany({ where: { id: { in: siteAlertIds } } });
                    await updateOrCreateStats('siteAlerts_deleted', siteAlertIds.length);
                    countSiteAlerts += siteAlertIds.length;
                }
                await prisma.site.delete({ where: { id: siteId } });
                await updateOrCreateStats('sites_deleted', 1);
                countSites++;

                if (Date.now() - startTime > MAX_DURATION) {
                    logger("Db-Cleanup Approaching max duration. Exiting user cleanup early.", "info");
                    continueDeletion = false;
                    break;
                }
            }
        }
        await prisma.user.delete({ where: { id: user.id } });
        countUsers++;
        await updateOrCreateStats('users_deleted', 1);
        const name = user.name || "";
        sendAccountDeletionConfirmationEmail(user.email, name);
        logger(`USER DELETED: Sent account deletion confirmation email to ${user.id}`, 'info');
    }
    logger(`Deleted ${countUsers} users, ${countSites} sites, ${countAlertMethods} alertMethods, ${countSiteAlerts} siteAlerts, ${countNotifications} notifications`, 'info');

    // Returning the counts
    return {
        deletedUsers: countUsers,
        deletedSites: countSites,
        deletedAlertMethods: countAlertMethods,
        deletedSiteAlerts: countSiteAlerts,
        deletedNotifications: countNotifications
    };
}

async function cleanSites(startTime: number) {
    let continueDeletion = true;

    let total_delCount_site = 0;
    let total_delCount_siteAlert = 0;
    let total_delCount_notification = 0;

    // Find all sites for deletion
    const allSites_toBe_deleted_Ids = (await prisma.site.findMany({
        where: { deletedAt: { lte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000) } },
        select: { id: true }
    })).map(site => site.id);

    for (const siteId of allSites_toBe_deleted_Ids) {
        if (!continueDeletion) break;

        let notificationIds = [];
        let siteAlertIds = [];

        // For each site, find all siteAlerts and associated notifications
        while (true) {
            const siteAlerts = await prisma.siteAlert.findMany({
                where: { siteId: siteId },
                select: {
                    id: true,
                    notifications: { select: { id: true } }
                }
            });

            if (siteAlerts.length === 0) break; // No more siteAlerts for the site

            for (const siteAlert of siteAlerts) {
                siteAlertIds.push(siteAlert.id);
                notificationIds.push(...siteAlert.notifications.map(n => n.id));
            }

            if (notificationIds.length > 0) {
                await prisma.notification.deleteMany({ where: { id: { in: notificationIds } } });
                await updateOrCreateStats('notifications_deleted', notificationIds.length);
                total_delCount_notification += notificationIds.length;
            }

            if (siteAlertIds.length > 0) {
                await prisma.siteAlert.deleteMany({ where: { id: { in: siteAlertIds } } });
                await updateOrCreateStats('siteAlerts_deleted', siteAlertIds.length);
                total_delCount_siteAlert += siteAlertIds.length;
            }

            // Check for timeout
            if (Date.now() - startTime > MAX_DURATION) {
                logger("Db-Cleanup Approaching max duration. Exiting site cleanup early.", "info");
                continueDeletion = false;
                break;
            }
        }

        // Deleting the site and updating site stats
        await prisma.site.delete({ where: { id: siteId } });
        await updateOrCreateStats('sites_deleted', 1);
        total_delCount_site++;
    }

    // Logging deletions
    logger(`
        Deleted ${total_delCount_site} sites
        Cascade Deleted ${total_delCount_siteAlert} site alerts
        Cascade Deleted ${total_delCount_notification} notifications
    `, 'info');

    //Return
    return {
        deletedSites: total_delCount_site,
        deletedSiteAlerts: total_delCount_siteAlert,
        deletedNotifications: total_delCount_notification
    };
}

async function cleanAlertMethods() {
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
    let loop = true;
    try {
        if (validCleanupOptions.includes(tableToClean)) {
            // Execute specific cleanup based on the provided option
            switch (tableToClean) {
                case 'geoEvent':
                    const geoEventsDeleted = await deleteGeoEventsBatch(startTime)
                    if (geoEventsDeleted == 0) {
                        loop = false;
                    }
                    res.status(200)
                        .json({
                            message: `Successfully deleted ${geoEventsDeleted} geo events`,
                            loop: loop
                        });
                    break;
                case 'verificationRequest':
                    const verificationRequestsDeleted = await deleteVerificationRequests()
                    if (verificationRequestsDeleted == 0) {
                        loop = false;
                    }
                    res.status(200)
                        .json({
                            message: `Successfully deleted ${verificationRequestsDeleted} verification requests`,
                            loop: loop
                        });
                    break;
                case 'user':
                    // Setting the batch size greater than 15 may lead to Transaction API error
                    const returnCountUser = await cleanUsers(startTime)
                    if (
                        returnCountUser.deletedUsers === 0 &&
                        returnCountUser.deletedSites === 0 &&
                        returnCountUser.deletedAlertMethods === 0 &&
                        returnCountUser.deletedSiteAlerts === 0 &&
                        returnCountUser.deletedNotifications === 0) {
                        loop = false;
                    }
                    res.status(200)
                        .json({
                            message: `Successfully cleaned up users. Deleted ${returnCountUser.deletedUsers} users, ${returnCountUser.deletedAlertMethods} alertMethods, ${returnCountUser.deletedSites} sites, ${returnCountUser.deletedSiteAlerts} siteAlerts, ${returnCountUser.deletedNotifications} notifications.`,
                            loop: loop
                        });
                    break;
                case 'site':
                    // Setting the batch size greater than 20 may lead to Transaction API error
                    const returnCountSite = await cleanSites(startTime)
                    if (
                        returnCountSite.deletedSites === 0 &&
                        returnCountSite.deletedSiteAlerts === 0 &&
                        returnCountSite.deletedNotifications === 0) {
                        loop = false;
                    }
                    res.status(200)
                        .json({
                            message: `Successfully cleaned up sites. Deleted ${returnCountSite.deletedSites} sites, ${returnCountSite.deletedSiteAlerts} siteAlerts, ${returnCountSite.deletedNotifications} notifications.`,
                            loop: loop
                        });
                    break;
                case 'alertMethod':
                    const alertMethodDeleted = await cleanAlertMethods()
                    if (alertMethodDeleted === 0) {
                        loop = false
                    }
                    res.status(200)
                        .json({
                            message: `Successfully deleted ${alertMethodDeleted} alertMethods`,
                            loop: loop
                        });
                    break;
                default:
                    // This should not be reached due to the includes check above
                    throw new Error(`Invalid cleanup option: ${tableToClean}`);
            }
        } else {
            // Default case: Execute all cleanups if no specific table is specified or if an invalid option is given
            let promises = [];
            promises.push(deleteGeoEventsBatch(startTime));
            promises.push(cleanUsers(startTime));
            promises.push(cleanSites(startTime));
            promises.push(cleanAlertMethods());
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
            message: `Something went wrong during cleanup. ${error}`,
            status: 500
        });
    }
}