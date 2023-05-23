import { NotificationParameters } from "../../../Interfaces/NotificationParameters";
import Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";

class WhatsAppNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.WHATSAPP];
    }

    notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
        const { type, confidence, longitude, latitude, distance, detectedBy, eventDate, data } = parameters;
        const message = (`${type} at [${longitude},${latitude}] ${distance}m from your site with ${confidence} confidence`);

        console.log(`Sending message ${message} to ${destination}`)

        return Promise.resolve(true);
    };
}

export default WhatsAppNotifier;