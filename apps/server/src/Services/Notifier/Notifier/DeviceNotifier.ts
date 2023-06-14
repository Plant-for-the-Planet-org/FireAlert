import { type NotificationParameters } from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";
import { env } from '../../../env.mjs';
import { logger } from "../../../../src/server/logger";

class DeviceNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.DEVICE];
    }

    // OneSignal can send both iOS and android notifications, 
    // "destination" from AlertMethod for method "device" 
    // is the OneSignal player ID of the device.

    async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
        const { message, subject, url, alert } = parameters;

        logger(`Sending message ${message} to ${destination}`, "info");

        // construct the payload for the OneSignal API
        const payload = {
            app_id: env.ONESIGNAL_APP_ID,
            include_player_ids: [destination],
            contents: { "en": message },
            headings: { "en": subject },
            url: url,
            data: alert ? alert : {},
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
        console.log(response);
        if (!response.ok) {
            logger(`Failed to send notification. Error: ${response.statusText}`, "error");
            return false;
        }

        return true;
    }
}

export default DeviceNotifier;
