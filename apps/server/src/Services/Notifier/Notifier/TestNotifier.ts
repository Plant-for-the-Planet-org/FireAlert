import { NotificationParameters } from "../../../Interfaces/NotificationParameters";
import Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";

class TestNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.TEST];
    }

    notify(destination: string, parameters: NotificationParameters): boolean {
        const { type, confidence, longitude, latitude, distance, detectedBy, eventDate, data } = parameters;

        console.log(`Build your message here and send it to ${destination}`)

        return true;
    };
}

export default TestNotifier;