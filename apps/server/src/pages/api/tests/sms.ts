// Call this api to run this page: http://localhost:3000/api/tests/sms?phoneNumber="encoded-phone-number"
import { type NextApiRequest, type NextApiResponse } from "next";
import { logger } from "../../../../src/server/logger";
import NotifierRegistry from "../../../Services/Notifier/NotifierRegistry";
import { NotificationParameters } from "../../../Interfaces/NotificationParameters"; // Adjust this import path if necessary

export default async function testSms(req: NextApiRequest, res: NextApiResponse) {
    logger(`Running Test SMS Sender.`, "info");

    // Extract the phone number from the query parameters
    const destination = req.query['phoneNumber'] as string;
    if (!destination) {
        return res.status(400).json({
            message: "Error: Phone number is required.",
            status: "400",
        });
    }

    // Create the notification parameters
    const notificationParameters: NotificationParameters = {
        message: "Test Message from Fire Alert",
        subject: "Test Message",
    };

    try {
        // Use the NotifierRegistry to get the SMS notifier
        const notifier = NotifierRegistry.get('sms');
        const isDelivered = await notifier.notify(destination, notificationParameters);
        
        if (isDelivered) {
            res.status(200).json({
                message: "SMS Sent Successfully!",
                status: "200",
            });
        } else {
            res.status(500).json({
                message: "Failed to send SMS.",
                status: "500",
            });
        }
    } catch (error) {
        logger(`Error sending test SMS: ${error}`, "error");
        res.status(500).json({
            message: `Error sending SMS`,
            status: "500",
        });
    }
}
