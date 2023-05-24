import { NotificationParameters } from "../../Interfaces/NotificationParameters";

interface Notifier {
    getSupportedMethods: () => string[]
    notify: (destination: string, parameters: NotificationParameters) => Promise<boolean>
}

export default Notifier;