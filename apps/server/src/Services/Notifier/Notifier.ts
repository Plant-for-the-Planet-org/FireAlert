import { NotificationParameters } from "../../Interfaces/NotificationParameters";

interface Notifier {
    getSupportedMethods: () => string[]
    notify: (destination: string, parameters: NotificationParameters) => boolean
}

export default Notifier;