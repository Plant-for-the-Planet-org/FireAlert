import type {AlertMethod} from '@prisma/client';
import type {AlertMethodMethod} from '../../Interfaces/AlertMethod';
import {prisma} from '../../server/db';
import {logger} from '../../server/logger';
import {NOTIFICATION_METHOD} from './methodConstants';
import EmailNotifier from './Notifier/EmailNotifier';

export type HandleFailedNotificationOptions = {
  destination: string;
  method: AlertMethodMethod | string;
};

// Maximum allowed failures before disabling each notification method
const MAX_FAIL_COUNT = {
  [NOTIFICATION_METHOD.SMS]: 3,
  [NOTIFICATION_METHOD.DEVICE]: 3,
  [NOTIFICATION_METHOD.WHATSAPP]: 3,
  [NOTIFICATION_METHOD.EMAIL]: 10,
  [NOTIFICATION_METHOD.WEBHOOK]: 20,
};

export async function handleFailedNotification(
  opts: HandleFailedNotificationOptions,
) {
  const {destination, method} = opts;

  try {
    // Find the failing alert method in database
    const failingAM = await prisma.alertMethod.findFirst({
      where: {destination, method},
    });

    if (!failingAM) {
      logger(`No AlertMethod found with ${method} & ${destination}`, 'error');
      return;
    }

    let isEnabled = true;

    // Disable the alert method if it exceeds maximum failure threshold
    if (failingAM.failCount >= MAX_FAIL_COUNT[method] - 1) {
      isEnabled = false;
    }

    // Update failure count and enabled status
    await prisma.alertMethod.updateMany({
      where: {destination, method},
      data: {isEnabled, failCount: {increment: 1}},
    });

    if (!isEnabled) {
      logger(`Disabled alertMethod for destination: ${destination}`, 'info');
      // For SMS, DEVICE, and WHATSAPP, try to find a fallback email method
      if (
        [
          NOTIFICATION_METHOD.SMS,
          NOTIFICATION_METHOD.DEVICE,
          NOTIFICATION_METHOD.WHATSAPP,
        ].includes(method)
      ) {
        const fallbackAM = await prisma.alertMethod.findFirst({
          where: {
            userId: failingAM.userId,
            method: NOTIFICATION_METHOD.EMAIL,
            isEnabled: true,
          },
          select: {destination: true},
        });
        if (!fallbackAM) {
          logger(
            `No Enabled Fallback AlertMethod found for ${destination}`,
            'error',
          );
          return;
        }
        // Notify user about disabled alert method via email
        await notifyDisabledAlertMethods(
          fallbackAM?.destination ?? destination,
          failingAM,
        );
      }
    } else {
      logger(
        `Updated failCount of alertMethod for destination: ${destination}`,
        'info',
      );
    }
  } catch (error) {
    const e = error as Error;
    logger(
      `Error handling failed ${method} notification: ${e.message}`,
      'error',
    );
  }
}

// Helper function to send email notification when an alert method is disabled
export async function notifyDisabledAlertMethods(
  destination: string,
  failingMethod: AlertMethod,
) {
  try {
    // Get a user-friendly name for the failing destination
    const failingDestination =
      failingMethod?.method === NOTIFICATION_METHOD.DEVICE
        ? failingMethod.deviceName ??
          failingMethod.deviceId ??
          failingMethod.destination
        : failingMethod.destination;

    const subject = `Disabled notification for ${failingDestination}`;
    const message = `<p>We have disabled the ${failingMethod.method} notification ${failingDestination} due to repeated errors.</p>

                    <p>Please check your FireAlert mobile app settings to ensure notifications are set up correctly.</p>

                    <p>If you believe this is a mistake, let us know by emailing us at <a href="mailto:firealert@plant-for-the-planet.org">firealert@plant-for-the-planet.org</a>.</p>
                              
                    <p>Best,<br>The FireAlert Team</p>
    `;

    const emailNotifier = new EmailNotifier();
    await emailNotifier.notify(destination, {subject, message});

    logger(
      `Notified about disabled alertMethod: ${failingDestination}`,
      'info',
    );
  } catch (error) {
    const e = error as Error;
    logger(
      `Error notifying disabled alertMethod for destination ${destination}: ${e.message} `,
      'error',
    );
  }
}
