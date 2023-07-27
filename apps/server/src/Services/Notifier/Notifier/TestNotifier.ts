// import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';

class TestNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.TEST];
  }

  notify(
    destination: string,
    // parameters: NotificationParameters,
  ): Promise<boolean> {
    // const {message, subject, url, alert} = parameters;

    console.log(`Build your message here and send it to ${destination}`);

    return Promise.resolve(true);
  }
}

export default TestNotifier;
