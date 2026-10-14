import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import {env} from '../../../env.mjs';
import {logger} from '../../../server/logger';
import {prisma} from '../../../server/db';
import {handleFailedNotification as genericFailedNotificationHandler} from '../handleFailedNotification';
import {getFirebaseMessaging} from '../../../server/firebaseAdmin';
import {PushProvider} from '@prisma/client';

// Android notification channel created by the native app on startup.
export const FCM_ANDROID_CHANNEL_ID = 'firealert-alerts';

// FCM errors that mean the token is dead or not ours. Only these count
// toward failCount; transient errors (quota, 5xx) must not disable devices.
const FCM_INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
]);

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

  // "destination" from AlertMethod for method "device" is either:
  // - a OneSignal subscription (player) ID, when pushProvider is NULL or ONESIGNAL (legacy apps)
  // - an FCM registration token, when pushProvider is FCM (new apps)
  // Both providers deliver to iOS and Android.

  async notify(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    const provider = await this.getPushProvider(destination);
    if (provider === PushProvider.FCM) {
      return this.notifyViaFcm(destination, parameters);
    }
    return this.notifyViaOneSignal(destination, parameters);
  }

  private async getPushProvider(destination: string): Promise<PushProvider> {
    const alertMethod = await prisma.alertMethod.findFirst({
      where: {destination, method: NOTIFICATION_METHOD.DEVICE},
      select: {pushProvider: true},
    });
    // NULL = row created before FCM existed, so it is a OneSignal ID.
    return alertMethod?.pushProvider ?? PushProvider.ONESIGNAL;
  }

  private async notifyViaFcm(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    const {message, subject, url, alert} = parameters;

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.warn(`[device-notifier] FCM not configured: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY missing`);
      logger(`Push notifications are disabled: FCM is not configured`, 'warn');
      return false;
    }

    logger(
      `DeviceNotifier: sending via FCM token=${destination.substring(0, 12)}..., notificationId=${parameters.id}, url=${url}, alertId=${alert?.id}`,
      'debug',
    );

    try {
      const messageId = await messaging.send({
        token: destination,
        notification: {title: subject, body: message},
        data: toFcmData({...(alert ?? {}), ...(url ? {url} : {})}),
        android: {
          priority: 'high',
          notification: {channelId: FCM_ANDROID_CHANNEL_ID, sound: 'default'},
        },
        apns: {
          headers: {'apns-priority': '10'},
          payload: {aps: {sound: 'default'}},
        },
      });
      logger(`DeviceNotifier: FCM accepted messageId=${messageId}`, 'debug');
      return true;
    } catch (error) {
      const code = (error as {code?: string})?.code ?? 'unknown';
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[device-notifier] FCM rejected: code=${code} message=${errorMessage} notificationId=${parameters.id} token=${destination.substring(0, 12)}...`,
      );
      logger(
        `Failed to send device notification via FCM (${code}) for ${parameters.id}`,
        'error',
      );

      if (FCM_INVALID_TOKEN_ERRORS.has(code)) {
        await this.handleFailedNotification({
          destination: destination,
          method: NOTIFICATION_METHOD.DEVICE,
        });
      }
      return false;
    }
  }

  private async notifyViaOneSignal(
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
        `[device-notifier] OneSignal rejected: ${reason} notificationId=${parameters.id} player_id=${destination.substring(0, 8)}...`,
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

/**
 * FCM data payload values must be strings. Objects (e.g. alert.data) and
 * dates are serialized so the app can parse them back.
 */
function toFcmData(input: Record<string, unknown>): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (value instanceof Date) {
      data[key] = value.toISOString();
    } else if (typeof value === 'object') {
      data[key] = JSON.stringify(value);
    } else {
      data[key] = String(value);
    }
  }
  return data;
}

export default DeviceNotifier;
