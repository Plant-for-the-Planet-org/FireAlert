// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/notification-creator

import { type NextApiRequest, type NextApiResponse } from "next";
import createNotifications from "../../../../src/Services/Notifications/CreateNotifications";
import { logger } from "../../../../src/server/logger";
import { env } from "../../../env.mjs";

export default async function notificationsCron(req: NextApiRequest, res: NextApiResponse) {
    debugger;
    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
        res.status(403).json({ message: "Unauthorized Invalid Cron Key" });
        return;
        }
    }

    try {
        // Call Create Notifications Service
        const notificationCount = await createNotifications();
        logger(`Added ${notificationCount} notifications`, "info");

        res.status(200).json({
            message: "Notification-creator cron job executed successfully",
            notificationCount: notificationCount,
            status: 200
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(statusCode).json({ message, status:statusCode });
    }
}
