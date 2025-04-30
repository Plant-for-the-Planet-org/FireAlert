import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import {env} from '../../../env.mjs';
import {logger} from '../../../server/logger';
import {prisma} from '../../../server/db';
import {handleFailedNotification as genericFailedNotificationHandler} from '../handleFailedNotification';

class DeviceNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.DEVICE];
  }

  async deleteNotificationAndDevice(
    destination: string,
    notificationId: string,
  ): Promise<void> {
    try {
      // Delete the notification
      await prisma.notification.delete({
        where: {
          id: notificationId,
        },
      });
      // Unverify and disable the alertMethod
      await prisma.alertMethod.deleteMany({
        where: {
          destination: destination,
          method: NOTIFICATION_METHOD.DEVICE,
        },
      });
      logger(
        `Notification with ID: ${notificationId} deleted and alertMethod for destination: ${destination} has been unverified and disabled.`,
        'info',
      );
    } catch (error) {
      logger(
        `Database Error: Couldn't modify the alertMethod or delete the notification: ${error}`,
        'error',
      );
    }
  }

  // OneSignal can send both iOS and android notifications,
  // "destination" from AlertMethod for method "device"
  // is the OneSignal player ID of the device.

  async notify(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    const {message, subject, url, alert} = parameters;

    // Check if OneSignal is configured
    if (!env.ONESIGNAL_APP_ID || !env.ONESIGNAL_REST_API_KEY) {
      logger(`Push notifications are disabled: OneSignal is not configured`, 'warn');
      return Promise.resolve(false);
    }

    // logger(`Sending message ${message} to ${destination}`, "info");

    // construct the payload for the OneSignal API
    const payload = {
      app_id: env.ONESIGNAL_APP_ID,
      include_player_ids: [destination],
      contents: {en: message},
      headings: {en: subject},
      url: url,
      data: alert ? alert : {},
    };

    // call OneSignal API to send the notification
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${env.ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    // console.log(response);
    if (!response.ok) {
      logger(
        `Failed to send device notification. Error: ${response.statusText} for ${parameters.id}`,
        'error',
      );

      await this.handleFailedNotification({
        destination: destination,
        method: NOTIFICATION_METHOD.DEVICE,
      });

      // If device not found
      // if (response.status === 404) {
      //   await this.deleteNotificationAndDevice(destination, parameters.id);
      // }
      return false;
    }

    return true;
  }

  handleFailedNotification = genericFailedNotificationHandler;
}

export default DeviceNotifier;
