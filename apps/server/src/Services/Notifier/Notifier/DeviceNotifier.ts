import { type NotificationParameters } from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";
import {env} from '../../../env.mjs'

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
            app_id: env.ONESIGNAL_APP_ID,
            //Todo get destination from alertMethod either user id, or PlayerId.
            include_external_user_ids: [destination],
            channel_for_external_user_ids: "push",
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
                'Authorization': `Basic ${env.ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json; charset=utf-8'
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