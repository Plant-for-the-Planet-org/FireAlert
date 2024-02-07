// to reach this endpoint call http://localhost:3000/api/{whatsapp}/{STOP}/{phonenumberwithout'+'}
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../server/db';
import NotifierRegistry from '../../../../Services/Notifier/NotifierRegistry';
import { logger } from '../../../../server/logger';
import { NotificationParameters } from '../../../../Interfaces/NotificationParameters';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    debugger;
    const { alertMethod, service, phoneNumber} = req.query;
    // Check if phoneNumber is a string
    if (typeof phoneNumber !== 'string') {
        res.status(400).json({
            message: 'Phone number must be a string.',
            status: '400',
        });
        return;
    }
    // Check if service is a string
    if (typeof service !== 'string') {
        res.status(400).json({
            message: 'Service must be a string.',
            status: '400',
        });
        return;
    }
    // Check if alertMethod is a string
    if (typeof alertMethod !== 'string') {
        res.status(400).json({
            message: 'Phone number must be a string.',
            status: '400',
        });
        return;
    }

    // Check if service is a valid string among ['PAUSE', 'STOP']
    if (!['STOP'].includes(service)) {
        res.status(400).json({
            message: 'Invalid service action provided.',
            status: '400',
        });
        return;
    }

    // Check if alertMethod is a valid string among ['sms', 'whatsspp']
    if (!['sms', 'whatsapp'].includes(alertMethod)) {
        res.status(400).json({
            message: 'Invalid service action provided.',
            status: '400',
        });
        return;
    }
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
    // Since phonNumber is a wa-id which is a whatsapp-id, which always start with a valid country code
    // prepending a '+' will transform that phonenumber to a valid E.164 format (which is the format that FA stores phonenumbers)
    const parsedPhoneNumber = parsePhoneNumberFromString(formattedPhoneNumber);
    let phoneNumberE164 = ''
    if (parsedPhoneNumber && parsedPhoneNumber.isValid()) {
        // If the phone number is valid, it's already in E.164 format thanks to the prepended '+'
        phoneNumberE164 = parsedPhoneNumber.format('E.164');
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
                    method: alertMethod
                },
                data: {
                    isEnabled: false,
                    isVerified: false,
                },
            });
            // Send sms message to whatsapp if disabled and unverified
            if(updateWhatsApp.count > 0){
                const notificationParameters: NotificationParameters = {
                    message: `Your FireAlert notifications for ${alertMethod} been stopped.`,
                    subject: 'FireAlert Notification STOP',
                };
                const notifier = NotifierRegistry.get('whatsapp');
                const isDelivered = await notifier.notify(phoneNumberE164, notificationParameters);
                if (isDelivered) {
                    res.status(200).json({
                        message: `Notification sent successfully via ${alertMethod}.`,
                        status: '200',
                    });
                } else {
                    res.status(500).json({
                        message: `Failed to send notification via ${alertMethod}.`,
                        status: '500',
                    });
                }
            }else {
                res.status(404).json({
                    message: `No ${alertMethod} alertMethods associated with that phonenumber`,
                    status: '404',
                });
            }
        } catch (error) {
            logger(`Error in ${alertMethod} service handler: ${error}`, 'error');
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
