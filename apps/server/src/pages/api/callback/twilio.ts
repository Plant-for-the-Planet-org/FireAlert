import type {NextApiRequest, NextApiResponse} from 'next';
import {logger} from '../../../server/logger';
import {prisma} from '../../../server/db';
import twilio from 'twilio';
import {env} from '../../../env.mjs';

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
    if (req.method === 'POST') {
      const rawBody = await getRawBody(req);
      const params = new URLSearchParams(rawBody);
      const messageSid = params.get('MessageSid');
      const messageStatus = params.get('MessageStatus');

      const accountSid = env.TWILIO_ACCOUNT_SID;
      const authToken = env.TWILIO_AUTH_TOKEN;
      const client = twilio(accountSid, authToken);

      client.validationRequests(req);

      logger(`Status of message ${messageSid!} is ${messageStatus!}`, `info`);

      let isDelivered = true;
      if (
        messageStatus === 'failed' ||
        messageStatus === 'undelivered' ||
        messageStatus === 'canceled'
      ) {
        isDelivered = false;
      }

      await prisma.$executeRaw`
        UPDATE "Notification"
        SET
          metadata = jsonb_set(
            metadata,
            '{status}',
            to_jsonb(${messageStatus}::text),
            true
          ),
          "isDelivered" = ${isDelivered}
        WHERE metadata->>'sid' = ${messageSid};
      `;

      return res.status(200).end();
    }

    return res.status(400).end();
  } catch (error) {
    return res.status(500).end();
  }
}
