// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/db-cleanup

import {type NextApiRequest, type NextApiResponse} from "next";
import {prisma} from '../../../server/db'
import {env} from "../../../env.mjs";
import {logger} from "../../../../src/server/logger";
import {sendAccountDeletionConfirmationEmail} from "../../../../src/utils/notification/userEmails";


// Run this cron every day once for max 60s.
export const config = {
    maxDuration: 300,
};
// Set up max duration dynamically to gracefully stop deletion before serverless timeout
const MAX_DURATION = (config.maxDuration) * 1000 - 20000

// Set up a uniform time to be 1 AM for cleanup reference
const currentDateTimeAt1AM = new Date();
currentDateTimeAt1AM.setHours(1, 0, 0, 0); // Set time to 1:00 AM of today

function shouldContinueDeletion(startTime: number, type_of_cleanup:string = 'database'): boolean {
    if (Date.now() - startTime > MAX_DURATION) {
        logger(`Db-Cleanup Approaching max duration. Exiting ${type_of_cleanup} cleanup early.`, "info");
        return false;
    }
    return true;
}

// Function to update or create stats data
async function updateOrCreateStats(metric: string, count: number) {
    await prisma.stats.upsert({
        where: {metric: metric},
        update: {count: {increment: count}, lastUpdated: new Date()},
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
    
    let continueDeletion = true;
    while (continueDeletion) {
        const geoEventsToDelete = await prisma.geoEvent.findMany({
            where: {
                eventDate: {
                    lt: new Date(currentDateTimeAt1AM.getTime() - 30 * 24 * 60 * 60 * 1000)
                }
            },
            take: batchSize,
            select: {id: true}
        });

        const deleteCount = geoEventsToDelete.length;
        if (deleteCount === 0) {
            break; // Exit the loop if no more records to delete
        }

        // Perform the deletion and stats update inside a transaction
        await prisma.$transaction(async (prisma) => {
            await prisma.geoEvent.deleteMany({
                where: {id: {in: geoEventsToDelete.map(event => event.id)}}
            });

            await updateOrCreateStats('geoEvents_deleted', deleteCount);
        });

        // Update the total deleted count
        totalDeleted += deleteCount;

        // Watchdog Timer
        continueDeletion = shouldContinueDeletion(startTime, "GeoEvent");
    }
    logger(`Deleted ${totalDeleted} geo events`, 'info');
    return totalDeleted;
}

async function deleteVerificationRequests() {
    const deletedVerificationRequests = await prisma.verificationRequest.deleteMany({
        where: {
            expires: {
                lt: new Date(currentDateTimeAt1AM.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
        }
    });
    logger(`Deleted ${deletedVerificationRequests.count} expired verification requests`, 'info');
    return deletedVerificationRequests.count;
}

async function cleanUsers(startTime: number) {
    let continueDeletion = true;

    let countUsers = 0;
    let countSites = 0;
    let countAlertMethods = 0;
    let countSiteAlerts = 0;
    let countNotifications = 0;

    // Find all users for deletion along with their alertMethods and sites
    const usersToBeDeleted = await prisma.user.findMany({
        where: {
            deletedAt: {
                lt: new Date(currentDateTimeAt1AM.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
        },
        select: {
            id: true,
            email: true,
            name: true,
            alertMethods: {select:{id: true}},
            sites: {select:{id: true}}
        }
    });

    for (const user of usersToBeDeleted) {
        continueDeletion = shouldContinueDeletion(startTime, "User");
        if (!continueDeletion) return {deletedUsers: countUsers, deletedSites: countSites, deletedAlertMethods: countAlertMethods, deletedSiteAlerts: countSiteAlerts, deletedNotifications: countNotifications};

        // Delete all alertMethods for the user
        const alertMethodIds = user.alertMethods.map(am => am.id);
        if (alertMethodIds.length > 0) {
            await prisma.alertMethod.deleteMany({where: {id: {in: alertMethodIds}}});
            countAlertMethods += alertMethodIds.length;
        }

        continueDeletion = shouldContinueDeletion(startTime, "User");
        if (!continueDeletion) return {deletedUsers: countUsers, deletedSites: countSites, deletedAlertMethods: countAlertMethods, deletedSiteAlerts: countSiteAlerts, deletedNotifications: countNotifications};

        const siteIds = user.sites.map(s => s.id)

        for (const siteId of siteIds) {
            const notificationIds: string[] = [];
            const siteAlertIds: string[] = [];

            const siteAlerts = await prisma.siteAlert.findMany({
                where: {siteId: siteId},
                select: {
                    id: true,
                    notifications: {select: {id: true}}
                }
            });

            for (const siteAlert of siteAlerts) {
                siteAlertIds.push(siteAlert.id);
                notificationIds.push(...siteAlert.notifications.map(n => n.id));
            }

            if (notificationIds.length > 0) {
                await prisma.notification.deleteMany({where: {id: {in: notificationIds}}});
                await updateOrCreateStats('notifications_deleted', notificationIds.length);
                countNotifications += notificationIds.length;
            }

            continueDeletion = shouldContinueDeletion(startTime, "User");
            if (!continueDeletion) return {deletedUsers: countUsers, deletedSites: countSites, deletedAlertMethods: countAlertMethods, deletedSiteAlerts: countSiteAlerts, deletedNotifications: countNotifications};


            if (siteAlertIds.length > 0) {
                await prisma.siteAlert.deleteMany({where: {id: {in: siteAlertIds}}});
                await updateOrCreateStats('siteAlerts_deleted', siteAlertIds.length);
                countSiteAlerts += siteAlertIds.length;
            }

            continueDeletion = shouldContinueDeletion(startTime, "User");
            if (!continueDeletion) return {deletedUsers: countUsers, deletedSites: countSites, deletedAlertMethods: countAlertMethods, deletedSiteAlerts: countSiteAlerts, deletedNotifications: countNotifications};


            await prisma.site.delete({where: {id: siteId}});
            await updateOrCreateStats('sites_deleted', 1);
            countSites++;

            continueDeletion = shouldContinueDeletion(startTime, "User");
            if (!continueDeletion) return {deletedUsers: countUsers, deletedSites: countSites, deletedAlertMethods: countAlertMethods, deletedSiteAlerts: countSiteAlerts, deletedNotifications: countNotifications};
        }
        await prisma.user.delete({where: {id: user.id}});
        countUsers++;
        await updateOrCreateStats('users_deleted', 1);
        const name = user.name || "";
        sendAccountDeletionConfirmationEmail(user.email, name);
        logger(`USER DELETED: Sent account deletion confirmation email to ${user.id}`, 'info');

        continueDeletion = shouldContinueDeletion(startTime, "User");
        if (!continueDeletion) return {deletedUsers: countUsers, deletedSites: countSites, deletedAlertMethods: countAlertMethods, deletedSiteAlerts: countSiteAlerts, deletedNotifications: countNotifications};
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
        where: {deletedAt: {lte: new Date(currentDateTimeAt1AM.getTime() - 7 * 24 * 60 * 60 * 1000)}},
        select: {id: true}
    })).map(site => site.id);

    for (const siteId of allSites_toBe_deleted_Ids) {
        const notificationIds = [];
        const siteAlertIds = [];

        // For each site, find all siteAlerts and associated notifications
        const siteAlerts = await prisma.siteAlert.findMany({
            where: {siteId: siteId},
            select: {
                id: true,
                notifications: {select: {id: true}}
            }
        });

        for (const siteAlert of siteAlerts) {
            siteAlertIds.push(siteAlert.id);
            notificationIds.push(...siteAlert.notifications.map(n => n.id));
        }

        if (notificationIds.length > 0) {
            await prisma.notification.deleteMany({where: {id: {in: notificationIds}}});
            await updateOrCreateStats('notifications_deleted', notificationIds.length);
            total_delCount_notification += notificationIds.length;
        }

        continueDeletion = shouldContinueDeletion(startTime, "Site");
        if (!continueDeletion) return {deletedSites: total_delCount_site, deletedSiteAlerts: total_delCount_siteAlert, deletedNotifications: total_delCount_notification};

        if (siteAlertIds.length > 0) {
            await prisma.siteAlert.deleteMany({where: {id: {in: siteAlertIds}}});
            await updateOrCreateStats('siteAlerts_deleted', siteAlertIds.length);
            total_delCount_siteAlert += siteAlertIds.length;
        }

        continueDeletion = shouldContinueDeletion(startTime, "Site");
        if (!continueDeletion) return {deletedSites: total_delCount_site, deletedSiteAlerts: total_delCount_siteAlert, deletedNotifications: total_delCount_notification};

        // Deleting the site and updating site stats
        await prisma.site.delete({where: {id: siteId}});
        await updateOrCreateStats('sites_deleted', 1);
        total_delCount_site++;

        continueDeletion = shouldContinueDeletion(startTime, "Site");
        if (!continueDeletion) return {deletedSites: total_delCount_site, deletedSiteAlerts: total_delCount_siteAlert, deletedNotifications: total_delCount_notification};
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
        where: {deletedAt: {lte: new Date(currentDateTimeAt1AM.getTime() - 7 * 24 * 60 * 60 * 1000)}},
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
            res.status(403).json({message: "Unauthorized: Invalid Cron Key"});
            return;
        }
    }
    const startTime = Date.now()
    // What is to be cleaned
    const validCleanupOptions = ['geoEvent', 'verificationRequest', 'user', 'site', 'alertMethod'];
    // Extract the 'clean' parameter from the request query
    const tableToClean = req.query['clean'] as string;
    let isClean = false;
    try {
        if (validCleanupOptions.includes(tableToClean)) {
            // Execute specific cleanup based on the provided option
            switch (tableToClean) {
                case 'geoEvent':{
                    const geoEventsDeleted = await deleteGeoEventsBatch(startTime)
                    if (geoEventsDeleted == 0) {
                        isClean = true;
                    }
                    res.status(200)
                        .json({
                            message: `Successfully deleted ${geoEventsDeleted} geo events`,
                            isClean: isClean,
                            status: 200
                        });
                    break;
                }
                case 'verificationRequest':{
                    const verificationRequestsDeleted = await deleteVerificationRequests()
                    if (verificationRequestsDeleted == 0) {
                        isClean = true;
                    }
                    res.status(200)
                        .json({
                            message: `Successfully deleted ${verificationRequestsDeleted} verification requests`,
                            isClean: isClean,
                            status: 200
                        });
                    break;
                }
                case 'user':{
                    // Setting the batch size greater than 15 may lead to Transaction API error
                    const returnCountUser = await cleanUsers(startTime)
                    if (
                        returnCountUser.deletedUsers === 0 &&
                        returnCountUser.deletedSites === 0 &&
                        returnCountUser.deletedAlertMethods === 0 &&
                        returnCountUser.deletedSiteAlerts === 0 &&
                        returnCountUser.deletedNotifications === 0) {
                        isClean = true;
                    }
                    res.status(200)
                        .json({
                            message: `Successfully cleaned up users. Deleted ${returnCountUser.deletedUsers} users, ${returnCountUser.deletedAlertMethods} alertMethods, ${returnCountUser.deletedSites} sites, ${returnCountUser.deletedSiteAlerts} siteAlerts, ${returnCountUser.deletedNotifications} notifications.`,
                            isClean: isClean,
                            status: 200
                        });
                    break;
                }                    
                case 'site':{
                    // Setting the batch size greater than 20 may lead to Transaction API error
                    const returnCountSite = await cleanSites(startTime)
                    if (
                        returnCountSite.deletedSites === 0 &&
                        returnCountSite.deletedSiteAlerts === 0 &&
                        returnCountSite.deletedNotifications === 0) {
                        isClean = true;
                    }
                    res.status(200)
                        .json({
                            message: `Successfully cleaned up sites. Deleted ${returnCountSite.deletedSites} sites, ${returnCountSite.deletedSiteAlerts} siteAlerts, ${returnCountSite.deletedNotifications} notifications.`,
                            isClean: isClean,
                            status: 200
                        });
                    break;
                }                    
                case 'alertMethod':{
                    const alertMethodDeleted = await cleanAlertMethods()
                    if (alertMethodDeleted === 0) {
                        isClean = true
                    }
                    res.status(200)
                        .json({
                            message: `Successfully deleted ${alertMethodDeleted} alertMethods`,
                            isClean: isClean,
                            status: 200
                        });
                    break;
                }                    
                default:{
                    // This should not be reached due to the includes check above
                    throw new Error(`Invalid cleanup option: ${tableToClean}`);
                }
            }
        } else {
            res.status(400).json({
                message: `Invalid cleanup option: ${tableToClean}`,
                status: 400
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