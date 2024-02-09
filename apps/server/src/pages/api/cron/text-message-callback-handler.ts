//To reach this endpoint call this URL (POST): http://localhost:3000/api/cron/text-message-callback-handler
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../server/db';
import NotifierRegistry from '../../../Services/Notifier/NotifierRegistry';
import { logger } from '../../../server/logger';
import { NotificationParameters } from '../../../Interfaces/NotificationParameters';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
        return;
    }

    const { alertMethodMethod, action, destination } = req.body;

    if (!alertMethodMethod || typeof alertMethodMethod !== 'string') {
        res.status(400).json({ message: 'alertMethodMethod must be a string.', status: '400' });
        return;
    }

    if (!['sms', 'whatsapp'].includes(alertMethodMethod)) {
        res.status(400).json({ message: 'Invalid alertMethodMethod provided.', status: '400' });
        return;
    }

    if (typeof destination !== 'string') {
        res.status(400).json({ message: 'Destination must be a string.', status: '400' });
        return;
    }

    const formattedPhoneNumber = destination.startsWith('+') ? destination : '+' + destination;
    const parsedPhoneNumber = parsePhoneNumberFromString(formattedPhoneNumber);
    let phoneNumberE164 = '';

    if (parsedPhoneNumber && parsedPhoneNumber.isValid()) {
        phoneNumberE164 = parsedPhoneNumber.format('E.164');
    } else {
        res.status(400).json({ message: 'Invalid destination phone number.', status: '400' });
        return;
    }

    if (action === 'STOP') {
        try {
            const unverifyAlertMethod = await prisma.alertMethod.updateMany({
                where: {
                    destination: phoneNumberE164,
                    method: alertMethodMethod,
                },
                data: {
                    isVerified: false,
                },
            });

            if (unverifyAlertMethod.count > 0) {
                const notificationParameters: NotificationParameters = {
                    message: `Your FireAlert notifications for ${alertMethodMethod} have been stopped, and your number has been unverified. If this is an error, please verify your number again from our app.`,
                    subject: 'FireAlert Notification STOP',
                };

                const notifier = NotifierRegistry.get(alertMethodMethod);
                const isDelivered = await notifier.notify(phoneNumberE164, notificationParameters);

                if (isDelivered) {
                    res.status(200).json({ message: `Notification sent successfully via ${alertMethodMethod}.`, status: '200' });
                } else {
                    res.status(500).json({ message: `Failed to send notification via ${alertMethodMethod}.`, status: '500' });
                }
            } else {
                res.status(404).json({ message: `No ${alertMethodMethod} alertMethods associated with that phonenumber`, status: '404' });
            }
        } catch (error) {
            logger(`Error in ${alertMethodMethod} service handler: ${error}`, 'error');
            res.status(500).json({ message: `Internal Server Error`, status: '500' });
        }
    } else {
        res.status(400).json({ message: 'Invalid action provided.', status: '400' });
    }
}
