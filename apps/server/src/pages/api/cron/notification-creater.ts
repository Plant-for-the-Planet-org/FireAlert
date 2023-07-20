// File: create-notifications.ts

import { type NextApiRequest, type NextApiResponse } from "next";
import createNotifications from "../../../../src/Services/Notifications/CreateNotifications";
import { env } from "../../../env.mjs";
import { logger } from "../../../../src/server/logger";
import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.join(__dirname, 'createNotificationsCron.lock');

export default async function createNotificationsCron(req: NextApiRequest, res: NextApiResponse) {
    if (fs.existsSync(LOCK_FILE)) {
        res.status(423).json({ message: "Another job is running" });
        return;
    }

    fs.closeSync(fs.openSync(LOCK_FILE, 'w'));  // create lock file

    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        // Verify the 'cron_key' in the request headers
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized Invalid Cron Key" });
            return;
        }
    }

    const notificationCount = await createNotifications();
    logger(`Added ${notificationCount} notifications`, "info");

    fs.unlinkSync(LOCK_FILE);  // remove lock file

    res.status(200).json({
        message: "Cron job executed successfully",
        notificationCount: notificationCount,
        status: 200
    });
}
