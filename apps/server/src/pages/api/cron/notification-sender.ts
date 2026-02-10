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

  const useIncidentNotifications = env.ENABLE_INCIDENT_NOTIFICATIONS as boolean;

  logger(
    `Running Notification Sender. Using ${
      useIncidentNotifications ? 'SiteIncident' : 'SiteAlert'
    } notifications.`,
    'info',
  );

  try {
    let notificationsSent: number;

    if (useIncidentNotifications) {
      notificationsSent = await SendIncidentNotifications.run(req);
    } else {
      notificationsSent = await sendNotifications({req});
    }

    if (notificationsSent === 0) {
      // No notifications were needed to be sent, but the job executed successfully
      res.status(200).json({
        message:
          'Cron job executed successfully, but no notifications were sent',
        status: '200',
        notificationsSent,
      });
    } else {
      // Notifications were sent successfully
      res.status(200).json({
        message: `Cron job executed successfully. ${notificationsSent} were sent`,
        status: '200',
        notificationsSent,
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
