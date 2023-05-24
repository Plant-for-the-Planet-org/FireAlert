import { type NotificationParameters } from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";

class WebhookNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.WEBHOOK];
    }
    
    // Goal of Webhook notifier is to return the payload to the webhook url specified by the user in AlertMethod.

    async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
        const { alertId, siteName, type, confidence, longitude, latitude, distance, detectedBy, eventDate, data } = parameters;
        
        const headline = `Heat anomaly near ${siteName} 🔥`;
        const url = `https://firealert.plant-for-the-planet.org/alert/${alertId}`;
        const message = `Detected ${distance} km outside ${siteName} with ${confidence} confidence. Check ${latitude}, ${longitude} for fires.`

        console.log(`Sending message ${message} to ${destination}`)

        // construct the payload for Webhook
        const payload = {
            message: message,
            headline: headline,
            url: url,
            alertData: {
                alertId: alertId,
                siteName: siteName,
                //Todo:
                //Instead of SiteName return site.Name, site.Id, site.projectId object except for geometry
                type: type,
                confidence: confidence,
                longitude: longitude,
                latitude: latitude,
                distance: distance,
                detectedBy: detectedBy,
                eventDate: eventDate,
                data: data
            }
        };

        // call Wehbook to send the notification
        const response = await fetch(`${destination}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: payload
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
