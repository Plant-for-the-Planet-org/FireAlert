import {prisma} from '../../../server/db';
import {logger} from '../../../server/logger';
import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import {env} from '../../../env.mjs';

class WhatsAppNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.WHATSAPP];
  }

  async deleteNotificationDisableAndUnverifyWhatsApp(destination: string, notificationId: string): Promise<void> {
    try {
      // Delete the notification
      await prisma.notification.delete({
        where: {
          id: notificationId,
        },
      });
      // Unverify and disable the alertMethod
      await prisma.alertMethod.updateMany({
        where: {
          destination: destination,
          method: NOTIFICATION_METHOD.WHATSAPP,
        },
        data: {
          isVerified: false,
          isEnabled: false,
        },
      });
      logger(`Notification with ID: ${notificationId} deleted and alertMethod for destination: ${destination} has been unverified and disabled.`, "info");
    } catch (error) {
      logger(`Database Error: Couldn't modify the alertMethod or delete the notification: ${error}`, "error");
    }
  }

  async notify(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    // logger(`Sending message ${message} to ${destination}`, "info");
    
    // construct the payload for Webhook
    const payload = {
      ...parameters
    };

    const WHATSAPP_ENDPOINT_URL = `${env.WHATSAPP_ENDPOINT_URL}?whatsAppId=${destination}`;  
    
    // call WehHook to send the notification
    const response = await fetch(WHATSAPP_ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-token-api': env.WHATSAPP_ENDPOINT_AUTH_TOKEN
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger(
        `Failed to send webhook notification. Error: ${response.statusText}  for ${parameters.id}.`,
        'error',
      );
      // Specific status code handling
      if (response.status === 404) {
        // Webhook URL Not Found - Token not found
        await this.deleteNotificationDisableAndUnverifyWhatsApp(destination, parameters.id as string);
      } else if (response.status === 401){
        // Unauthorized
        await this.deleteNotificationDisableAndUnverifyWhatsApp(destination, parameters.id as string);
      } else if (response.status === 403){
        // Forbidden
        await this.deleteNotificationDisableAndUnverifyWhatsApp(destination, parameters.id as string);
      } else {
        logger(
          `Failed to send webhook notification. Something went wrong. Try again in next run.`,
          'error',
        );
      }
      return false;
    }
    return true;
  }
}

export default WhatsAppNotifier;
