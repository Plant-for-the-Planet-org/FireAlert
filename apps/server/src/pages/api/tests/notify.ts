// to execute, point your browser to: http://localhost:3000/api/tests/notify

import {type NextApiResponse} from 'next';
import {PrismaClient} from '@prisma/client';
import NotifierRegistry from '../../../Services/Notifier/NotifierRegistry';
import {logger} from '../../../../src/server/logger';

export default async function notify(
  res: NextApiResponse,
) {
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
        const {id, alertMethod, destination, siteAlert} =
          notification;
        const {confidence, type, longitude, latitude} = siteAlert;

        const notifier = NotifierRegistry.get(alertMethod);
        const isDelivered = notifier.notify(
          destination,
          `${type} at [${longitude},${latitude}] with ${confidence} confidence`,
        );

        if (isDelivered) {
          const response = await prisma.notification.update({
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
