import twilio from "twilio";
import { env } from "../../env.mjs";


// Function to send an SMS using Twilio
export const sendSMS = async (phoneNumber: string, message: string) => {
    try {
        const accountSid = env.TWILIO_ACCOUNT_SID;
        const authToken = env.TWILIO_AUTH_TOKEN;
        const twilioPhoneNumber = env.TWILIO_PHONE_NUMBER;
        // Create a Twilio client
        const client = twilio(accountSid, authToken);

        // Send the SMS
        await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: phoneNumber,
        });

        return true; // SMS sent successfully
    } catch (error) {
        console.error("Error sending SMS:", error);
        return false; // Failed to send SMS
    }
};
