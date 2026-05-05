// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/notification-creator

import {type NextApiRequest, type NextApiResponse} from 'next';
import {CreateIncidentNotifications} from '../../../../src/Services/Notifications/CreateIncidentNotifications';
import createNotifications from '../../../../src/Services/Notifications/CreateNotifications';
import {logger, escapeLogfmt} from '../../../../src/server/logger';
import {env} from '../../../env.mjs';

export default async function notificationsCron(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Verify the 'cron_key' in the request headers before proceeding
  if (env.CRON_KEY) {
    const cronKey = req.query['cron_key'];
    if (!cronKey || cronKey !== env.CRON_KEY) {
      res.status(403).json({message: 'Unauthorized Invalid Cron Key'});
      return;
    }
  }

  logger(
    'stage=NotificationCreator event=start routing="alert=device,webhook incident=email,sms,whatsapp"',
    'debug',
  );

  try {
    // Run both services in parallel for method-based routing
    const [alertNotifications, incidentStats] = await Promise.all([
      createNotifications(), // SiteAlert-based (device, webhook)
      CreateIncidentNotifications.run(), // SiteIncident-based (email, sms, whatsapp)
    ]);

    const incidentNotifications = incidentStats.totalNotificationsCreated;
    const totalNotifications = alertNotifications + incidentNotifications;

    logger(
      `stage=NotificationCreator event=summary alert=${alertNotifications} incident=${incidentNotifications} total=${totalNotifications} merge_start=${incidentStats.createdMergeStart} merge_end=${incidentStats.createdMergeEnd} skipped_stop_alerts=${incidentStats.skippedStopAlerts} skipped_single_alert_end=${incidentStats.skippedSingleAlertEnd} skipped_parent_end=${incidentStats.skippedParentEnd}`,
      'info',
    );

    res.status(200).json({
      message:
        'Notification-creator cron job executed successfully with method-based routing',
      alertNotifications: alertNotifications,
      incidentNotifications: incidentNotifications,
      incidentNotificationStats: incidentStats,
      totalNotifications: totalNotifications,
      status: 200,
    });
  } catch (error: unknown) {
    const statusCode =
      error instanceof Error && 'statusCode' in error
        ? (error.statusCode as number)
        : 500;
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    const stack = error instanceof Error ? error.stack ?? 'n/a' : 'n/a';

    logger(
      `stage=NotificationCreator event=failure status=${statusCode} message="${escapeLogfmt(message)}" stack="${escapeLogfmt(stack)}"`,
      'error',
    );
    return res.status(statusCode).json({message, status: statusCode});
  }
}
