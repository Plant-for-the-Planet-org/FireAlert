// Call this api to run this page: http://localhost:3000/api/tests/whatsapp?phoneNumber="E.164-phone-number"
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



    // Create the notification parameters for an alert
    const notificationParameters_alert: NotificationParameters = {
        message: "Fire detected inside Las Americas 7A",
        subject: "FireAlert", 
        url: "https://firealert.plant-for-the-planet.org/alert/ed1cf199-6c3a-4406-bac0-eb5519391e2e", 
        id: "notificationId",
        authenticationMessage: true,
        otp: "12345",
        siteName: 'Las Americas',
        alert:{
            id: "ed1cf199-6c3a-4406-bac0-eb5519391e2e",
            type: 'fire',
            confidence: 'high',
            source: "TEST",
            date: new Date(),
            longitude: 80.45728,
            latitude: 66.66537,
            distance: 0,
            siteId: "siteId1",
            siteName: "SiteName",
            data: {},
        }
    };

    // Create the notification parameters for an alert
    const notificationParameters_otp: NotificationParameters = {
        message: "12345 is your FireAlert one time code.",
        subject: "FireAlert Verification", 
        url: "https://firealert.plant-for-the-planet.org/verify/123345alertMethodId/?code=12345", 
    };

    try {
        // Use the NotifierRegistry to get the WhatsApp notifier
        const notifier = NotifierRegistry.get('whatsapp');
        const isDelivered = await notifier.notify(encodedPhoneNumber, notificationParameters_alert);
        
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
