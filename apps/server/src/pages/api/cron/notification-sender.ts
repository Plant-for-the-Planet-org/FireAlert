import { type NextApiRequest, type NextApiResponse } from "next";
import { env } from "../../../env.mjs";
import sendNotifications from "../../../Services/Notifications/SendNotifications";
import { logger } from "../../../../src/server/logger";

export default async function notificationSender(req: NextApiRequest, res: NextApiResponse) {
    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        // Verify the 'cron_key' in the request headers
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized Invalid Cron Key" });
            return;
        }
    }

    await sendNotifications()

    logger(`Running Notification Sender.`, "info");

    res.status(200).json({ message: "Cron job executed successfully" });
}