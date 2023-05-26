import { type NotificationParameters } from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";

class WebhookNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.WEBHOOK];
    }
    
    // Goal of Webhook notifier is to return the payload to the webhook url specified by the user in AlertMethod.

    async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
        const { alertId, siteId, siteName, message, subject, url, type, confidence, longitude, latitude, distance, detectedBy, eventDate, data } = parameters;
    
        console.log(`Sending message ${message} to ${destination}`)

        // construct the payload for Webhook
        const payload = {
            id: alertId,
            type: type,
            longitude: longitude,
            latitude: latitude,
            distance: distance,
            source: detectedBy,
            date: eventDate,
            confidence: confidence,
            siteName: siteName,
            siteId: siteId,
            message: message,
            subject: subject,
            url: url,
            data: data
        };

        // call Wehbook to send the notification
        const response = await fetch(`${destination}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`Failed to send notification. Error: ${response.statusText}`);
            return false;
            // Todo:
            // On Alert Method table set failcount = failcount + 1
            // If failcount > 3 disable Alert Method, and send email to user.email
            
        }

        return true;
    }
}

export default WebhookNotifier;
