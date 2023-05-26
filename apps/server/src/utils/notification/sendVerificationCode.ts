import { TRPCError } from "@trpc/server";
import { sendEmail } from "./sendEmail";
import { sendSMS, sendWhatsApp } from "./sendSMS";
import { sendPushNotification } from "./sendPush";
import { sendWebhook } from "./sendWebhook";

type Method = 'sms' | 'device' | 'email' | 'whatsapp' | 'webhook';

export async function sendVerificationCode(destination: string, method: Method, deviceId: string, subject: string, message: string, url: string) {
    if (method === 'email') {
        const emailSent = await sendEmail(destination, "FireAlert Verification", message);
        if (!emailSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via email",
            });
        } else {
            return { status: 200, message: "Verification code has been sent" };
        }
    } else if (method === 'sms') {
        const smsSent = await sendSMS(destination, message);
        if (!smsSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via SMS",
            });
        } else {
            return { status: 200, message: "Verification code has been sent" };
        }
    } else if (method === 'device') {
        // destination is onesignal device player id
        const pushSent = await sendPushNotification(destination, subject, message, url);
        if (!pushSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via iOS push notification",
            });
        } else {
            return { status: 200, message: "Verification code has been sent" };
        }

    } else if (method === 'whatsapp') {
        const whatsappSent = await sendWhatsApp(destination, message);
        if (!whatsappSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via WhatsApp",
            });
        } else {
            return { status: 200, message: "Verification code has been sent" };
        }
    } else if (method === 'webhook') {
        const webhookSent = await sendWebhook(destination, { message });
        if (!webhookSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via webhook",
            });
        } else {
            return { status: 200, message: "Verification code has been sent" };
        }
    }
}