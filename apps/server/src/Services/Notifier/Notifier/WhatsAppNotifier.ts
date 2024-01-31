import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import {logger} from '../../../../src/server/logger';
// import { isPhoneNumberRestricted } from '../../../utils/notification/restrictedSMS';
import {env} from '../../../env.mjs';

class WhatsAppNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.WHATSAPP];
  }

  async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
    const {message, url, id} = parameters;

    // // Validate the destination phone number
    // if (!destination || isPhoneNumberRestricted(destination)) {
    //   logger(`Invalid or restricted destination phone number: ${destination}`, 'error');
    //   // Optionally delete the notification or take other actions
    //   return false;
    // }

    const n8n_WebHookURL = env.N8N_WEBHOOK_URL; 

    // Construct the payload for the webhook
    const payload = {
      destination: destination,
      message: message,
      url: url ? url : ''
    };

    // Send the notification via the n8n webhook
    try {
      const response = await fetch(n8n_WebHookURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      logger(`WhatsApp message sent to ${destination}`, 'info');
      return true;
    } catch (error) {
      logger(`Failed to send WhatsApp message via webhook. Error: ${error}`, 'error');
      // TODO: handle specific error codes and potentially disable or modify alert methods
      return false;
    }
  }
}

export default WhatsAppNotifier;
