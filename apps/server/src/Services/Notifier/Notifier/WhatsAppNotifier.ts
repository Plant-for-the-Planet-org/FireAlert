import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import twilio from 'twilio';
import {env} from '../../../env.mjs';
import {logger} from '../../../../src/server/logger';

class WhatsAppNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.WHATSAPP];
  }

  notify(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    const {message, url} = parameters;
    logger(`Sending WhatsApp message ${message} to ${destination}`, 'info');

    // Twilio Credentials
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = env.TWILIO_WHATSAPP_NUMBER;
    const client = twilio(accountSid, authToken);

    // Define message body and send message
    const messageBody = `${message} ${url ? url : ''}`;

    return client.messages
      .create({
        body: messageBody,
        from: 'whatsapp:' + whatsappNumber,
        to: 'whatsapp:' + destination,
      })
      .then(() => {
        return true;
      })
      .catch(error => {
        logger(`Failed to send WhatsApp message. Error: ${error}`, 'error');
        return false;
      });
  }
}

export default WhatsAppNotifier;
