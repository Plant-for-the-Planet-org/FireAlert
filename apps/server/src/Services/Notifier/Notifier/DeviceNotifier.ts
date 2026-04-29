import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import {env} from '../../../env.mjs';
import {logger} from '../../../server/logger';
import {prisma} from '../../../server/db';
import {handleFailedNotification as genericFailedNotificationHandler} from '../handleFailedNotification';

// Subset of the OneSignal Create Notification response we rely on.
// Full schema: https://documentation.onesignal.com/reference/create-notification
type OneSignalNotificationResponse = {
  id?: string;
  recipients?: number;
  errors?: {
    invalid_player_ids?: string[];
    [key: string]: unknown;
  };
};

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger(
        `Database Error: Couldn't modify the alertMethod or delete the notification: ${errorMessage}`,
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
      console.warn(`[device-notifier] OneSignal not configured — ONESIGNAL_APP_ID=${!!env.ONESIGNAL_APP_ID} ONESIGNAL_REST_API_KEY=${!!env.ONESIGNAL_REST_API_KEY}`);
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

    logger(
      `DeviceNotifier: sending to player_id=${destination}, notificationId=${parameters.id}, url=${url}, alertId=${alert?.id}`,
      'debug',
    );

    // call OneSignal API to send the notification
    // This calls legacy api endpoint
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      // For Latest use https://api.onesignal.com/notifications read more at the docs
      method: 'POST',
      headers: {
        Authorization: `Basic ${env.ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const responseBody = (await response
      .json()
      .catch(() => null)) as OneSignalNotificationResponse | null;
    logger(
      `DeviceNotifier: OneSignal response status=${response.status}, body=${JSON.stringify(responseBody)}`,
      'debug',
    );

    // OneSignal returns HTTP 200 even when zero recipients were reached
    // (e.g. invalid_player_ids, unsubscribed devices). Treat those as
    // failures so failCount increments and operators have observability.
    const invalidPlayerIds = responseBody?.errors?.invalid_player_ids;
    const hasInvalidPlayers = !!invalidPlayerIds?.length;
    const noneDelivered =
      responseBody?.id === '' || responseBody?.recipients === 0;
    const oneSignalRejection = hasInvalidPlayers || noneDelivered;

    if (!response.ok || oneSignalRejection) {
      const reason = !response.ok
        ? `HTTP ${response.status} ${response.statusText}`
        : hasInvalidPlayers
          ? `invalid_player_ids=${JSON.stringify(invalidPlayerIds)}`
          : `noneDelivered (id="${responseBody?.id}", recipients=${responseBody?.recipients})`;

      console.error(
        `[device-notifier] OneSignal rejected: ${reason} notificationId=${parameters.id} player_id=${destination} body=${JSON.stringify(responseBody)}`,
      );
      logger(
        `Failed to send device notification (${reason}) for ${parameters.id}`,
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
