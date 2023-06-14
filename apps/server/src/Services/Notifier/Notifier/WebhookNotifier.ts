import { logger } from "../../../../src/server/logger";
import { type NotificationParameters } from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";

class WebhookNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.WEBHOOK];
    }

    async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
        const {subject, message, url, alert } = parameters;
        logger(`Sending message ${message} to ${destination}`, "info");

        // construct the payload for Webhook
        const payload = {
            subject: subject,
            message: message,
            url: url,
            alert: alert? alert : {},
        };

        // call WehHook to send the notification
        const response = await fetch(`${destination}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

        if (!response.ok) {
            logger(`Failed to send notification. Error: ${response.statusText}`, "error");
            return false;
        }

        return true;
    }
}

export default WebhookNotifier;
