import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import twilio from 'twilio';
import {env} from '../../../env.mjs';
import {logger} from '../../../../src/server/logger';

class SMSNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.SMS];
  }

  notify(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    const {message, subject, url} = parameters;

    // if env.TWILIO_ACCOUNT_SID or env.TWILIO_AUTH_TOKEN or env.TWILIO_PHONE_NUMBER is not set return promise with false
    if (
      !env.TWILIO_ACCOUNT_SID ||
      !env.TWILIO_AUTH_TOKEN ||
      !env.TWILIO_PHONE_NUMBER
    ) {
      logger(
        `Error sending SMS: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN or TWILIO_PHONE_NUMBER is not set`,
        'error',
      );
      return Promise.resolve(false);
    }
    // logger(`Sending message ${message} to ${destination}`, "info");

    // Twilio Credentials
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const phoneNumber = env.TWILIO_PHONE_NUMBER;
    const client = twilio(accountSid, authToken);

    // Define message body and send message
    const messageBody = `${subject} ${message} ${url ? url : ''}`;

    return client.messages
      .create({
        body: messageBody,
        from: phoneNumber,
        to: destination,
      })
      .then(() => {
        return true;
      })
      .catch(error => {
        logger(`Failed to send SMS. Error: ${error}`, 'error');
        return false;
      });
  }
}

export default SMSNotifier;
