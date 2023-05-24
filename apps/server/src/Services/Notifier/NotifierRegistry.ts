import Notifier from "./Notifier";

import WhatsAppNotifier from "./Notifier/WhatsAppNotifier";
import DeviceNotifier from "./Notifier/DeviceNotifier";
import TestNotifier from "./Notifier/TestNotifier";

const createNotifierRegistry = (notifiers: Notifier[]) => {

    const registry: { [method: string]: Notifier } = {};

    notifiers.forEach((notifier: Notifier) => {
        notifier.getSupportedMethods().map((method: string) => {
            if (registry[method]) {
                throw new Error(`Notifier for method '${method}' has already been registered`);
            }
            registry[method] = notifier;
        })
    });

    return {
        get: (method: string): Notifier => {
            const notifier = registry[method];
            if (!notifier) {
                throw new Error(`Notifier with key '${method}' not found`);
            }
            return notifier;
        }
    };
}

const NotifierRegistry = createNotifierRegistry([
    new WhatsAppNotifier(),
    new DeviceNotifier(),
    new TestNotifier(),
]);

export default NotifierRegistry;