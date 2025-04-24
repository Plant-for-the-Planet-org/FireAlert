import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type {AdditionalOptions} from '../../../Interfaces/AdditionalOptions';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import {isPhoneNumberRestricted} from '../../../utils/notification/restrictedSMS';
import twilio from 'twilio';
import {env} from '../../../env.mjs';
import {logger} from '../../../../src/server/logger';
import {prisma} from '../../../server/db';
import {headers} from 'next/headers';

interface TwilioError {
  code: number;
  status: number | string;
  message: string;
  [key: string]: any;
}

export function verifyTwilioEnvironment() {
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
    return false;
  }

  return true;
}

class SMSNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.SMS];
  }

  async disableAlertMethodsForDestination(destination: string): Promise<void> {
    try {
      const result = await prisma.alertMethod.updateMany({
        where: {destination: destination, method: NOTIFICATION_METHOD.SMS},
        data: {isEnabled: false, failCount: {increment: 1}},
      });

      if (result.count > 0) {
        logger(`Disabled alertMethod for destination: ${destination}`, 'info');
      } else {
        logger(`No AlertMethod found for destination: ${destination}`, 'info');
      }
    } catch (dbError) {
      logger(
        `Database Error when disabling alertMethod for destination: ${destination}.`,
        'error',
      );
    }
  }

  async notify(
    destination: string,
    parameters: NotificationParameters,
    options?: AdditionalOptions,
  ): Promise<boolean> {
    const {message, url, id} = parameters;

    if (!verifyTwilioEnvironment()) {
      return Promise.resolve(false);
    }

    // If the destination is a restricted Country, return false, log error.
    if (isPhoneNumberRestricted('sms', destination)) {
      logger(`destination ${destination}`, 'info');
      // If destination is a restricted phone number
      // Then, notification was created before FireAlert introduced SMS Restriction
      // Thus, notification must be deleted, so that it is not constantly marked as "not-delivered"
      await prisma.notification.delete({where: {id: id}});

      // Resolve the promise with false ensures that notifier function stops for this notification
      return Promise.resolve(false);
    }

    // Twilio Credentials
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const phoneNumber = env.TWILIO_PHONE_NUMBER;

    let statusCallback = env.TWILIO_STATUS_CALLBACK_URL ?? '';
    if (!statusCallback && options?.req) {
      const host = (options.req.headers['x-forwarded-host'] ||
        options.req.headers.host) as string;
      statusCallback = `https://${host}/api/callback/twilio`;
    }

    const client = twilio(accountSid, authToken);

    // Define message body and send message
    const messageBody = `${message!} ${url ? url : ''}`;

    return client.messages
      .create({
        body: messageBody,
        from: phoneNumber,
        to: destination,
        statusCallback,
      })
      .then(async value => {
        const {sid, status, errorCode, errorMessage} = value;
        logger(`Twilio message status ${status}`, 'info');

        if (errorCode || errorMessage) {
          const logString = `Twilio Log: ${errorCode} ${errorMessage}`;
          logger(logString, 'error');
        }

        // update Notification.metadata with sid & status. Do not set these but append the JSON object with these keys.
        const updateJson = JSON.stringify({sid: sid, status: status});
        await prisma.$executeRaw`
          UPDATE "Notification"
          SET metadata = COALESCE(metadata, '{}'::jsonb) || ${updateJson}::jsonb
          WHERE id = ${id};
        `;

        return true;
      })
      .catch(async (error: TwilioError) => {
        const {code, status, message} = error;

        // General logging for all failed attempts
        logger(`Failed to send SMS. Error code: ${code}`, 'error');

        const logString = `Twilio Error: ${code} ${message}`;
        logger(logString, 'error');

        // https://www.twilio.com/docs/api/errors
        // https://www.twilio.com/docs/api/errors/<ERROR_CODE>

        // Error codes for which alertMethods should be disabled
        const disableCodes = [21610, 21612, 30005, 21408, 21211];

        // Error codes for which the error should just be logged
        const logErrorCodes = [30008, 30007, 30006, 30003];

        if (disableCodes.includes(code)) {
          logger(
            `${message}. Disabling AlertMethods associated with this Phone Number`,
            'error',
          );

          // Disable corresponding alertMethods
          await this.disableAlertMethodsForDestination(destination);
        } else if (logErrorCodes.includes(code)) {
          // Additional detailed logging for just logging error codes
          logger(
            `${message}. Error while sending SMS to ${destination}.`,
            'error',
          );
        }

        const updateJson = JSON.stringify({status: status});
        await prisma.$executeRaw`
          UPDATE "Notification"
          SET metadata = COALESCE(metadata, '{}'::jsonb) || ${updateJson}::jsonb
          WHERE id = ${id};
        `;

        return false;
      });
  }
}

export default SMSNotifier;
