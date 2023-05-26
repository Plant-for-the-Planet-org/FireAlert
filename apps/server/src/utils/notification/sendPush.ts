import { env } from "../../env.mjs";

// Function to send a push notification using OneSignal
export const sendPushNotification = async (deviceToken: string, subject: string, message: string, url:string) => {
    try {
        const appId = env.ONESIGNAL_APP_ID;
        
        // Create the request body
        const payload = {
            app_id: appId,
            headings: { en: subject }, // English message content
            contents: { en: message }, // English message content
            include_player_ids: [deviceToken],
            url: url
        };

        // call OneSignal API to send the notification
        await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${env.ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        return true; // Push notification sent successfully
    } catch (error) {
        console.error("Error sending push notification:", error);
        return false; // Failed to send push notification
    }
};

// Setting up One Signal
//TODO: register this alertMethod with OneSignal
// const { createHmac } = await import('crypto');

// const ONESIGNAL_REST_API_KEY = env.ONESIGNAL_REST_API_KEY;
// const ONESIGNAL_APP_ID = env.ONESIGNAL_APP_ID;

// const identifier = input.destination;
// const hmacIdentifier = createHmac('sha256', ONESIGNAL_REST_API_KEY);
// hmacIdentifier.update(identifier);
// const identifier_auth_hash = hmacIdentifier.digest('hex');

// const external_user_id = userId;
// const hmacExternalUserID = createHmac('sha256', ONESIGNAL_REST_API_KEY);
// hmacExternalUserID.update(external_user_id);
// const external_user_id_auth_hash = hmacExternalUserID.digest('hex');

// let device_type;
// if (input.method === 'email') {
//   device_type = 11
// }
// if (input.method === 'sms') {
//   device_type = 14
// }
// if (input.method === 'device') {
//   if (input.deviceType === 'ios') {
//     device_type = 0
//   } else if (input.deviceType === 'android') {
//     device_type = 1
//   }
// }

// var myHeaders = new Headers();
// myHeaders.append("Content-Type", "application/json");

// var raw = JSON.stringify({
//   "app_id": ONESIGNAL_APP_ID,
//   "device_type": device_type,
//   "identifier": identifier,
//   "identifier_auth_hash": identifier_auth_hash,
//   "external_user_id": external_user_id,
//   "external_user_id_auth_hash": external_user_id_auth_hash,
//   "language": "en",
// });

// var requestOptions = {
//   method: 'POST',
//   headers: myHeaders,
//   body: raw,
// };
// const response = await fetch("https://onesignal.com/api/v1/players", requestOptions);
// const result = await response.text();
// const oneSignalResult = JSON.parse(result);