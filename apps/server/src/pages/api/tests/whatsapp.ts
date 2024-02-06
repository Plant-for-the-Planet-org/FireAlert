// Call this api to run this page: http://localhost:3000/api/tests/whatsapp?phoneNumber="encoded-phone-number"
import { type NextApiRequest, type NextApiResponse } from "next";
import { logger } from "../../../../src/server/logger";
import NotifierRegistry from "../../../Services/Notifier/NotifierRegistry";
import { NotificationParameters } from "../../../Interfaces/NotificationParameters"; // Adjust this import path if necessary

export default async function testWhatsApp(req: NextApiRequest, res: NextApiResponse) {
    debugger;
    logger(`Running Test WhatsApp Sender.`, "info");

    // Extract the phone number from the query parameters
    const destination = req.query['phoneNumber'] as string;

    if (!destination) {
        return res.status(400).json({
            message: "Error: Phone number is required.",
            status: "400",
        });
    }

    // URL encode the phone number
    const encodedPhoneNumber: string = encodeURIComponent(destination);



    // Create the notification parameters
    const notificationParameters: NotificationParameters = {
        message: "Test Message from Fire Alert via WhatsApp",
        subject: "Test Message", // Although 'subject' might not be used in WhatsApp messages, it's included to match the NotificationParameters structure.
        url: "http://example.com", // Optional: Include if you want to test sending URLs.
        id: "unique-id" // Optional: Adjust based on actual requirement, if it's needed for logging or other purposes.
    };

    try {
        // Use the NotifierRegistry to get the WhatsApp notifier
        const notifier = NotifierRegistry.get('whatsapp');
        const isDelivered = await notifier.notify(encodedPhoneNumber, notificationParameters);
        
        if (isDelivered) {
            res.status(200).json({
                message: "WhatsApp Message Sent Successfully!",
                status: "200",
            });
        } else {
            res.status(500).json({
                message: "Failed to send WhatsApp Message.",
                status: "500",
            });
        }
    } catch (error) {
        logger(`Error sending test WhatsApp: ${error}`, "error");
        res.status(500).json({
            message: `Error sending WhatsApp Message`,
            status: "500",
        });
    }
}
