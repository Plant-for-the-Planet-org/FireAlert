import type {NextApiRequest, NextApiResponse} from 'next';
import {logger} from '../../../server/logger';
import {prisma} from '../../../server/db';
import {validateRequest} from 'twilio';
import {env} from '../../../env.mjs';
import SMSNotifier from '../../../Services/Notifier/Notifier/SMSNotifier';
import {NOTIFICATION_METHOD} from '../../../Services/Notifier/methodConstants';

export const config = {
  api: {bodyParser: false},
};

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', err => reject(err));
  });
}

export default async function webhookHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const authToken = env.TWILIO_AUTH_TOKEN;
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] ||
      req.headers.host) as string;
    const url = `${protocol}://${host}${req.url!}`;

    if (req.method === 'POST') {
      const rawBody = await getRawBody(req);
      const params = Object.fromEntries(new URLSearchParams(rawBody));

      const isValid = validateRequest(authToken, twilioSignature, url, params);
      if (!isValid) {
        return res
          .status(403)
          .json({status: 403, message: 'Invalid Twilio signature'});
      }

      const messageSid = params['MessageSid'];
      const messageStatus = params['MessageStatus'];

      logger(`Status of message ${messageSid} is ${messageStatus}`, `info`);

      let isDelivered = true;
      if (
        messageStatus === 'failed' ||
        messageStatus === 'undelivered' ||
        messageStatus === 'canceled'
      ) {
        isDelivered = false;
      }

      // await prisma.$executeRaw`
      //   UPDATE "Notification"
      //   SET
      //     metadata = jsonb_set(
      //       metadata,
      //       '{status}',
      //       to_jsonb(${messageStatus}::text),
      //       true
      //     ),
      //     "isDelivered" = ${isDelivered}
      //   WHERE metadata->>'sid' = ${messageSid};
      // `;

      const notification = await prisma.notification.findFirst({
        where: {metadata: {path: ['sid'], equals: messageSid}},
        select: {
          id: true,
          destination: true,
          metadata: true,
        },
      });

      const notificationId = notification?.id;
      const existingMetadata = notification?.metadata || {};

      await prisma.notification.update({
        where: {id: notificationId},
        data: {
          metadata: {
            ...existingMetadata,
            sid: messageSid,
            status: messageStatus,
          },
          isDelivered: isDelivered,
        },
      });

      try {
        if (!isDelivered) {
          const smsNotifier = new SMSNotifier();
          await smsNotifier.handleFailedNotification({
            destination: notification?.destination ?? '',
            method: NOTIFICATION_METHOD.SMS,
          });
        }
      } catch (error) {
        // Empty catch to non-blocking execution.
        const e = error as Error;
        logger(`Error while handling twilio webhook ${e.message}`, 'error');
      }

      return res.status(200).end();
    }

    return res.status(400).end();
  } catch (error) {
    return res.status(500).end();
  }
}
