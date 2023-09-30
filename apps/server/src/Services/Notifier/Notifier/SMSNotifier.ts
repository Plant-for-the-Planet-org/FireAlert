import { type NotificationParameters } from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";
import twilio from 'twilio';
import { env } from '../../../env.mjs';
import { logger } from "../../../../src/server/logger";
import { prisma } from "../../../server/db";

class SMSNotifier implements Notifier {

  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.SMS];
  }

  async disableAlertMethodsForDestination(destination: string): Promise<void> {
    try {
      await prisma.alertMethod.updateMany({
        where: {
          destination: destination,
          method: NOTIFICATION_METHOD.SMS
        },
        data: {
          isEnabled: false
        }
      });
      logger(`Disabled SMS alert method for destination: ${destination}`, "info");
    } catch (dbError) {
      logger(`Database Error disabling SMS alert method for destination: ${destination}.`, "error");
    }
  }

  notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
    const { message, url } = parameters;

    // if env.TWILIO_ACCOUNT_SID or env.TWILIO_AUTH_TOKEN or env.TWILIO_PHONE_NUMBER is not set return promise with false
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      logger(`Error sending SMS: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN or TWILIO_PHONE_NUMBER is not set`, "error");
      return Promise.resolve(false);
    }
    // logger(`Sending message ${message} to ${destination}`, "info");
  

    // Twilio Credentials
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const phoneNumber = env.TWILIO_PHONE_NUMBER;
    const client = twilio(accountSid, authToken);

    // Define message body and send message
    const messageBody = `${message} ${url ? url : ''}`;

    // // Temporarily halting SMS sending process. 
    // logger(`SMS sending is temporarily stopped`, "info");
    // // Indicate a "successful" operation
    // return Promise.resolve(true); 

    return client.messages
      .create({
        body: messageBody,
        from: phoneNumber,
        to: destination,
      })
      .then(() => {
        return true;
      })
      .catch(async(error) => {
        logger(`Failed to send SMS.`, "error");

        // Check if error code is 21610
        if (error.code === 21610) {
          logger(`${error}. Disabling AlertMethods associated with this Phone Number`,"error")
          // Disable corresponding alertMethods
          await this.disableAlertMethodsForDestination(destination);
        }

        return false;
      });
  }
}

export default SMSNotifier;
