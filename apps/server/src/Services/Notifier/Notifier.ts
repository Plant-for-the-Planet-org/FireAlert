import type {AdditionalOptions} from '../../Interfaces/AdditionalOptions';
import type {NotificationParameters} from '../../Interfaces/NotificationParameters';
import type {HandleFailedNotificationOptions} from './handleFailedNotification';

interface Notifier {
  getSupportedMethods: () => string[];
  notify: (
    destination: string,
    parameters: NotificationParameters,
    options?: AdditionalOptions,
  ) => Promise<boolean>;

  handleFailedNotification?: (
    opts: HandleFailedNotificationOptions,
  ) => Promise<void>;
}

export default Notifier;
