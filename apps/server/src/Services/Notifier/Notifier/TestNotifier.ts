import Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";

class TestNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.TEST];
    }

    notify(destination: string, message: string): boolean {
        console.log(`Sending message ${message} to ${destination}`)

        return true;
    };
}

export default TestNotifier;