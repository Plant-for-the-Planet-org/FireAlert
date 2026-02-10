// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/notification-creator

import {type NextApiRequest, type NextApiResponse} from 'next';
import {CreateIncidentNotifications} from '../../../../src/Services/Notifications/CreateIncidentNotifications';
import createNotifications from '../../../../src/Services/Notifications/CreateNotifications';
import {logger} from '../../../../src/server/logger';
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

  const useIncidentNotifications = env.ENABLE_INCIDENT_NOTIFICATIONS === true;

  logger(
    `Running Notification Creator. Using ${
      useIncidentNotifications ? 'SiteIncident' : 'SiteAlert'
    } notifications.`,
    'info',
  );

  try {
    let notificationCount: number;

    if (useIncidentNotifications) {
      // Call Create Incident Notifications Service
      notificationCount = await CreateIncidentNotifications.run();
      logger(`Added ${notificationCount} incident notifications`, 'info');
    } else {
      // Call legacy Create Notifications Service
      notificationCount = await createNotifications();
      logger(`Added ${notificationCount} site alert notifications`, 'info');
    }

    res.status(200).json({
      message: 'Notification-creator cron job executed successfully',
      notificationCount: notificationCount,
      status: 200,
    });
  } catch (error: unknown) {
    const statusCode =
      error instanceof Error && 'statusCode' in error
        ? (error.statusCode as number)
        : 500;
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';

    logger(`Error executing notification creator: ${message}`, 'error');
    return res.status(statusCode).json({message, status: statusCode});
  }
}
