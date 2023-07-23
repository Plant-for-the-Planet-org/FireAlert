// to execute this handler, access the endpoint: http://localhost:3000/api/cron/unfreeze-sites

import { type NextApiRequest, type NextApiResponse } from "next";
import { env } from "../../../env.mjs";
import { logger } from "../../../../src/server/logger";
import { prisma } from "../../../../src/server/db";

// Run this cron every X minutes.
// This cron will check sites that have been marked as frozen due to a false positive alerts and unfreeze them if 6 hours has passed.

export default async function unfreezeSites(req: NextApiRequest, res: NextApiResponse) {
    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        // Verify the 'cron_key' in the request headers
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized: Invalid Cron Key" });
            return;
        }
    }

    // Get all sites that have isFrozen as true and falseAlertTime older than 6 hours
    const frozenSites = await prisma.site.findMany({
        where: {
            isFrozen: true,
            falseAlertTime: {
                lt: new Date(new Date().getTime() - 6 * 60 * 60 * 1000)  // 6 hours ago
            }
        }
    });

    // If there are no sites to be unfrozen, send a success message
    if (frozenSites.length === 0) {
        res.status(200).json({
            message: "Success! No sites need to be unfrozen.",
            status: 200
        });
        return;
    }

    // If there are sites to be unfrozen, add them in a promist list 
    const unfreezePromises = frozenSites.map(site => prisma.site.update({
        where: { id: site.id },
        data: { isFrozen: false }
    }));

    try {
        // Unfreeze the sites
        await Promise.all(unfreezePromises);
        logger(`Unfroze ${frozenSites.length} sites`, "info");

        res.status(200).json({
            message: "Success! Sites have been unfrozen!",
            status: 200
        });
    } catch (error) {
        logger(`Something went wrong during unfreezing sites. ${error}`, "error");
        res.status(500).json({
            message: "Something went wrong during unfreezing sites.",
            status: 500
        });
    }
}
