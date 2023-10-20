// to execute, point your browser to: http://localhost:3000/api/tests/test-messages

// Necessary imports here
import { type NextApiRequest, type NextApiResponse } from 'next';
import NotifierRegistry from '../../../Services/Notifier/NotifierRegistry';
import { logger } from '../../../../src/server/logger';

export default async function sendTestNotification(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    // Extract alertMethod and destination from the request parameters
    const { alertMethod, destination, id } = req.query;

    if (!alertMethod || !destination || !id) {
        res.status(400).json({ message: 'Missing required parameters: alertMethod and destination' });
        return;
    }

    logger('Sending test notification.', 'info');

    // Prepare the notification content
    const testMessage = 'Test Message'; // This is the predefined message
    const subject = 'Test Notification Subject'; // You can adjust the subject as needed

    // Construct the notification parameters
    const notificationParameters= {
        id: id as string,
        message: testMessage,
        subject: subject,
    };

    try {
        // Get the notifier based on the alertMethod
        const notifier = NotifierRegistry.get(alertMethod as string);

        // Send the notification
        const isDelivered = await notifier.notify(destination as string, notificationParameters);

        if (isDelivered) {
            res.status(200).json({
                message: 'Test notification sent successfully',
            });
        } else {
            res.status(500).json({
                message: 'Failed to send test notification',
            });
        }
    } catch (error) {
        logger(`Error sending test notification:${error}`, 'error');

        res.status(500).json({
            message: 'An error occurred while sending test notification',
        });
    }
}
