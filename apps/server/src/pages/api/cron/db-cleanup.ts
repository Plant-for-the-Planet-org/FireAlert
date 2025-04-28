// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/db-cleanup

import {type NextApiRequest, type NextApiResponse} from "next";
import {prisma} from '../../../server/db'
import {env} from "../../../env.mjs";
import {logger} from "../../../../src/server/logger";

// Run this cron every day once for max 60s.
export const config = {
    maxDuration: 300,
};

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

    try {
        // Check if dry_run parameter is provided
        const dryRun = req.query['dry_run'] === 'true';
        
        // Execute the cleanup function with dry-run parameter
        const results = await prisma.$queryRaw`
            SELECT * FROM cleanup_old_records(${dryRun})
        `;
        
        // Log success
        logger(`Database cleanup completed successfully. Dry run: ${dryRun}`, 'info');
        
        res.status(200).json({
            message: 'Database cleanup completed successfully',
            status: 200,
            dryRun: dryRun,
            results: results
        });
    } catch (error) {
        logger(`Something went wrong during cleanup. ${error}`, "error");
        res.status(500).json({
            message: `Something went wrong during cleanup. ${error}`,
            status: 500
        });
    }
}