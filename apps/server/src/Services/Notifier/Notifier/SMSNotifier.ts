import { type NotificationParameters } from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";
import twilio from 'twilio';

class SMSNotifier implements Notifier {

    getSupportedMethods(): Array<string> {
        return [NOTIFICATION_METHOD.SMS];
    }

    notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
        const { type, confidence, longitude, latitude, distance, detectedBy, eventDate, data } = parameters;
        const message = (`${type} at [${longitude},${latitude}] ${distance}m from your site with ${confidence} confidence`);

        console.log(`Sending message ${message} to ${destination}`)
        const accountSid = <string>process.env.TWILIO_ACCOUNT_SID;
        const authToken = <string>process.env.TWILIO_AUTH_TOKEN;
        const phoneNumber = <string>process.env.TWILIO_PHONE_NUMBER;
        const client = twilio(accountSid, authToken);
        
        return client.messages
          .create({
            body: message,
            from: phoneNumber,
            to: destination,
          })
          .then((message) => {
            console.log("Message sent successfully");
            return true;
          })
          .catch((error) => {
            console.log(error);
            return false;
          });
    }
}

export default SMSNotifier;
