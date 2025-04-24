import type {AdditionalOptions} from '../../Interfaces/AdditionalOptions';
import type {NotificationParameters} from '../../Interfaces/NotificationParameters';

interface Notifier {
  getSupportedMethods: () => string[];
  notify: (
    destination: string,
    parameters: NotificationParameters,
    options?: AdditionalOptions,
  ) => Promise<boolean>;
}

export default Notifier;
