import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../server/db';
import NotifierRegistry from '../../../../Services/Notifier/NotifierRegistry';
import { logger } from '../../../../server/logger';
import { NotificationParameters } from '../../../../Interfaces/NotificationParameters';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    debugger;
    const { service, phoneNumber} = req.query;
    // Since phonNumber is a wa-id which is a whatsapp-id, which always start with a valid country code
    // prepending a '+' will transform that phonenumber to a valid E.164 format (which is the format that FA stores phonenumbers)
    const formattedPhoneNumber = parsePhoneNumberFromString('+' + phoneNumber);
    let phoneNumberE164 = ''
    if (formattedPhoneNumber && formattedPhoneNumber.isValid()) {
        // If the phone number is valid, it's already in E.164 format thanks to the prepended '+'
        phoneNumberE164 = formattedPhoneNumber.format('E.164');
    } else {
        // If the phone number is not valid, throw an error
        res.status(400).json({
            message: 'Invalid WhatsApp phone number.',
            status: '400',
        });
    }
    if (service === 'STOP') {
        try {
            // Unverify and Disable all alertMethod with that phonenumber
            // Note: This unverifies and disables both sms and whatsapp for that phonenumber
            const updateWhatsApp = await prisma.alertMethod.updateMany({
                where: {
                    destination: phoneNumberE164,
                },
                data: {
                    isEnabled: false,
                    isVerified: false,
                },
            });
            // Send sms message to whatsapp if disabled and unverified
            if(updateWhatsApp.count > 0){
                const notificationParameters: NotificationParameters = {
                    message: `Your FireAlert notifications for WhatsApp been stopped as per your request. If this was a mistake, please contact support.`,
                    subject: 'FireAlert Notification STOP',
                };
                const notifier = NotifierRegistry.get('whatsapp');
                const isDelivered = await notifier.notify(phoneNumberE164, notificationParameters);
                if (isDelivered) {
                    res.status(200).json({
                        message: 'Notification sent successfully via WhatsApp.',
                        status: '200',
                    });
                } else {
                    res.status(500).json({
                        message: 'Failed to send notification via WhatsApp.',
                        status: '500',
                    });
                }
            }else {
                res.status(404).json({
                    message: 'No alertMethods associated with that WhatsApp Id',
                    status: '404',
                });
            }
        } catch (error) {
            logger(`Error in WhatsApp service handler: ${error}`, 'error');
            res.status(500).json({
                message: `Internal Server Error`,
                status: '500',
            });
        }
    } else {
        // Handle other services or send a 400 Bad Request response
        res.status(400).json({
            message: 'Invalid service action provided.',
            status: '400',
        });
    }
}
