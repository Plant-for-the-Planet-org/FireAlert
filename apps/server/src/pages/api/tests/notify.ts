// to execute, point your browser to: http://localhost:3000/api/tests/notify

import {NextApiRequest, type NextApiResponse} from 'next';
import {PrismaClient} from '@prisma/client';
import NotifierRegistry from '../../../Services/Notifier/NotifierRegistry';
import {logger} from '../../../../src/server/logger';
import {env} from '../../../../src/env.mjs';

export default async function notify(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (env.NODE_ENV !== 'development') {
    return res.status(401).json({
      message:
        'Unauthorized for Production. Only use this endpoint for development.',
      status: 401,
    });
  }
  if (env.CRON_KEY) {
    // Verify the 'cron_key' in the request headers
    const cronKey = req.query['cron_key'];
    if (!cronKey || cronKey !== env.CRON_KEY) {
      res.status(403).json({message: 'Unauthorized: Invalid Cron Key'});
      return;
    }
  }

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  // get all Notifications
  try {
    // TODO: in case we implement a max retry-count, filter by retryCount < max_retry_count
    const notifications = await prisma.notification.findMany({
      where: {
        isDelivered: false,
      },
      include: {
        siteAlert: true,
      },
    });

    await Promise.all(
      notifications.map(async notification => {
        const {id, alertMethod, destination, siteAlert} = notification;
        const {confidence, type, longitude, latitude} = siteAlert;

        const notifier = NotifierRegistry.get(alertMethod);
        const isDelivered = await notifier.notify(
          destination,
          `${type} at [${longitude},${latitude}] with ${confidence} confidence`,
          {req},
        );

        if (isDelivered) {
          await prisma.notification.update({
            where: {id: id},
            data: {
              isDelivered: true,
            },
          });
          // const a = response;
        } else {
          // increment the retry count if a pre-defined limit has not been reached
        }
      }),
    );
  } catch (error) {
    logger('Error while fetching notifications', error);
  }
  res.status(200).json({message: 'Notification sent successfully'});
}
