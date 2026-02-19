import {type NextApiRequest, type NextApiResponse} from 'next';
import {env} from '../../../env.mjs';
import {SendIncidentNotifications} from '../../../Services/Notifications/SendIncidentNotifications';
import sendNotifications from '../../../Services/Notifications/SendNotifications';
import {logger} from '../../../../src/server/logger';

export default async function notificationSender(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Verify the 'cron_key' in the request headers before proceeding
  if (env.CRON_KEY) {
    // Verify the 'cron_key' in the request headers
    const cronKey = req.query.cron_key;
    if (!cronKey || cronKey !== env.CRON_KEY) {
      res.status(403).json({message: 'Unauthorized: Invalid Cron Key'});
      return;
    }
  }

  logger(
    'Running Notification Sender with method-based routing: SiteAlert (device, webhook) + SiteIncident (email, sms, whatsapp)',
    'info',
  );

  try {
    // Run both services in parallel for method-based routing
    const [alertNotificationsSent, incidentNotificationsSent] =
      await Promise.all([
        sendNotifications({req}), // SiteAlert-based (device, webhook)
        SendIncidentNotifications.run(req), // SiteIncident-based (email, sms, whatsapp)
      ]);

    const totalNotificationsSent =
      alertNotificationsSent + incidentNotificationsSent;

    if (totalNotificationsSent === 0) {
      // No notifications were needed to be sent, but the job executed successfully
      res.status(200).json({
        message:
          'Cron job executed successfully with method-based routing, but no notifications were sent',
        status: '200',
        alertNotificationsSent,
        incidentNotificationsSent,
        totalNotificationsSent,
      });
    } else {
      // Notifications were sent successfully
      res.status(200).json({
        message: `Cron job executed successfully with method-based routing. ${totalNotificationsSent} notifications were sent`,
        status: '200',
        alertNotificationsSent,
        incidentNotificationsSent,
        totalNotificationsSent,
      });
    }
  } catch (error: unknown) {
    // Handle genuine failure (e.g., database connection issue)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger(`Error executing notification sender: ${errorMessage}`, 'error');
    res.status(307).json({
      message: 'Cron job failed to execute',
      status: '307',
    });
  }
}
