import Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";

class WhatsAppNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.WHATSAPP];
    }

    notify(destination: string, message: string): boolean {
        console.log(`Sending message ${message} to ${destination}`)

        return true;
    };
}

export default WhatsAppNotifier;