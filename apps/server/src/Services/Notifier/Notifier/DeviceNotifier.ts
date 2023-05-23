import { NotificationParameters } from "../../../Interfaces/NotificationParameters";
import Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";

class DeviceNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.DEVICE];
    }
    
    // OneSignal can send both iOS and android notifications, we just need to know the userID to deliver to.
    // This ID is stored as destination in the alertMethod table.

    async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
        const { alertId, siteName, type, confidence, longitude, latitude, distance, detectedBy, eventDate, data } = parameters;
        
        const headline = `Heat anomaly near ${siteName} 🔥`;
        const url = `https://firealert.plant-for-the-planet.org/alert/${alertId}`;
        const message = `Detected ${distance} km outside ${siteName} with ${confidence} confidence. Check ${latitude}, ${longitude} for fires.`

        console.log(`Sending message ${message} to ${destination}`)

        // construct the payload for the OneSignal API
        const payload = {
            app_id: process.env.ONESIGNAL_APP_ID,
            //Todo get destination from alertMethod either user id, or PlayerId.
            include_external_user_ids: destination,
            contents: { "en": message },
            headings: { "en": headline },
            url: url,
            data: {
                alertId: alertId,
                siteName: siteName,
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

        // call OneSignal API to send the notification
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
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
    };
}

export default DeviceNotifier;
