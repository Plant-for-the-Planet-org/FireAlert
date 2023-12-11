import {type NotificationParameters} from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import {NOTIFICATION_METHOD} from "../methodConstants";
import {isPhoneNumberRestricted} from "../../../utils/notification/restrictedSMS"
import twilio from 'twilio';
import {env} from '../../../env.mjs';
import {logger} from "../../../../src/server/logger";
import {prisma} from "../../../server/db";

class SMSNotifier implements Notifier {

  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.SMS];
  }

  async disableAlertMethodsForDestination(destination: string): Promise<void> {
    try {
      const result = await prisma.alertMethod.updateMany({
        where: {
          destination: destination,
          method: NOTIFICATION_METHOD.SMS
        },
        data: {
          isEnabled: false
        }
      });

      if (result.count > 0) {
        logger(`Disabled alertMethod for destination: ${destination}`, "info");
      } else {
        logger(`No alertMethod found for destination: ${destination}`, "info");
      }
    } catch (dbError) {
      logger(`Database Error when disabling alertMethod for destination: ${destination}.`, "error");
    }
  }


  async notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
    const { message, url, id } = parameters;

    // if env.TWILIO_ACCOUNT_SID or env.TWILIO_AUTH_TOKEN or env.TWILIO_PHONE_NUMBER is not set return promise with false
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      logger(`Error sending SMS: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN or TWILIO_PHONE_NUMBER is not set`, "error");
      return Promise.resolve(false);
    }
    
    // If the destination is a restricted Country, return false, log error.
    if (isPhoneNumberRestricted(destination)) {
      // If destination is a restricted phone number
      // Then, notification was created before FireAlert introduced SMS Restriction
      // Thus, notification must be deleted, so that it is not constantly marked as "not-delivered"
      await prisma.notification.delete({
        where:{
          id: id
        }
      })
      // Resolve the promise with false ensures that notifier function stops for this notification
      return Promise.resolve(false);
    }

    // Twilio Credentials
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const phoneNumber = env.TWILIO_PHONE_NUMBER;
    const client = twilio(accountSid, authToken);

    // Define message body and send message
    const messageBody = `${message} ${url ? url : ''}`;

    return client.messages
      .create({
        body: messageBody,
        from: phoneNumber,
        to: destination,
      })
      .then(() => {
        return true;
      })
      .catch(async (error) => {
        // General logging for all failed attempts
        logger(`Failed to send SMS. Error code: ${error.code}`, "error");

        // Error codes for which alertMethods should be disabled
        const disableCodes = [21610, 30005, 21408, 21211];

        // Error codes for which the error should just be logged
        const logErrorCodes = [30008, 30007, 30006, 30003];

        if (disableCodes.includes(error.code)) {
          // Log a more detailed message for these error codes
          logger(`${error}. Disabling AlertMethods associated with this Phone Number`, "error");

          // Disable corresponding alertMethods
          await this.disableAlertMethodsForDestination(destination);
        } else if (logErrorCodes.includes(error.code)) {
          // Additional detailed logging for just logging error codes
          logger(`${error.message}. Error while sending SMS to ${destination}.`, "error");
        }

        return false;
      });
  }
}

export default SMSNotifier;
