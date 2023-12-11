// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/db-cleanup

import { type NextApiRequest, type NextApiResponse } from "next";
import { prisma } from '../../../server/db'
import { env } from "../../../env.mjs";
import { logger } from "../../../../src/server/logger";
import { sendAccountDeletionConfirmationEmail } from "../../../../src/utils/notification/userEmails";

// Run this cron every day once for max 60s.
export const config = {
    maxDuration: 60,
};

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

    const promises = [];

    // Since our database follows cascade-on-delete constraint, when a User is deleted, 
    // it will cascade delete AlertMethod, Site, and Project. 
    // Also, deleting a Site will cascade delete SiteAlert, 
    // and deleting a SiteAlert will cascade delete Notification, so the db-cleanup follows this order
    // to optimize the cleanup process.

    // item 1:
    // delete all geo events that are older than 30 days and have been processed
    promises.push(prisma.geoEvent.deleteMany({
        where: {
            isProcessed: true,
            eventDate: {
                lt: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
            }
        }
    }));

    // item 2:
    // Delete all users who've requested to be deleted and have deletedAt date older than 7 days
    // Send sendAccountDeletionConfirmationEmail to all users who qualify for deletion,
    // and then delete them immediately
    const usersToBeDeleted =
        await prisma.user.findMany({
            where: {
                deletedAt: {
                    lt: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

    // Send email to all users who qualify for deletion
    for (const user of usersToBeDeleted) {
        await sendAccountDeletionConfirmationEmail(user);

        // Note that we aren't deleting Auth0 Accounts using FireAlert. We should likely delete it if there is no remoteID set.
        // Let's leave this as TODO for now.
        // We have a n8n worker that deletes Auth0 accounts if sub is provided.

        logger(`USER DELETED: Sent account deletion confirmation email to ${user.id}`, 'info',);
    }


    // Delete all users who qualify for deletion
    promises.push(prisma.user.deleteMany({
        where: {
            deletedAt: {
                lt: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
            }
        }
    }));

    // item 3:
    // Delete all Sites that have been soft-deleted and have deletedAt date older than 30 days and doesn't have a remoteId
    promises.push(prisma.site.deleteMany({
        where: {
            deletedAt: {
                lte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
            },
            remoteId: null
        }
    }));

    // item 4:
    // Delete all AlertMethods that have been soft-deleteted for longer than 7 days
    promises.push(prisma.alertMethod.deleteMany({
        where: {
            deletedAt: {
                lte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
            }
        }
    }))

    // item 5:
    // Delete all SiteAlerts that have deletedAt date older than 30 days
    promises.push(prisma.siteAlert.deleteMany({
        where: {
            eventDate: {
                lte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
            }
        }
    }));

    // We do not delete notifications, as we will need notifications data in the future for further analysis

    try {

        const [deletedGeoEvents, deletedUsers, deletedSites, deletedAlertMethods, deletedSiteAlerts] =
            await Promise.all(promises);
        
        logger(`
                Deleted ${deletedGeoEvents.count} geo events that are older than 30 days and have been processed
                Deleted ${deletedUsers.count} users who've requested to be deleted and have deletedAt date older than 7 days
                Deleted ${deletedSites.count} soft-deleted Sites
                Deleted ${deletedAlertMethods.count} soft-deleted AlertMethods
                Deleted ${deletedSiteAlerts.count} soft-deleted SiteAlerts
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
