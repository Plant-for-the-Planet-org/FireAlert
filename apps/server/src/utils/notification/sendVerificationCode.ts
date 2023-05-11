import { TRPCError } from "@trpc/server";
import { sendEmail } from "./sendEmail";
import { sendSMS, sendWhatsApp } from "./sendSMS";
import { sendPushNotification } from "./sendPush";
import { sendWebhook } from "./sendWebhook";

type Method = 'sms' | 'device' | 'email' | 'whatsapp';

type DeviceType = 'ios' | 'android' | undefined

export async function sendVerificationCode(destination: string, method: Method, deviceType: DeviceType, message: string) {
    if (method === 'email') {
        const emailSent = await sendEmail(destination, "FireAlert Verification", message);
        if (!emailSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via email",
            });
        } else {
            return { status: 200, message: "Code sent to user" };
        }
    } else if (method === 'sms') {
        const smsSent = await sendSMS(destination, message);
        if (!smsSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via SMS",
            });
        } else {
            return { status: 200, message: "Code sent to user" };
        }
    } else if (method === 'device') {
        const pushTokenIdentifier = destination
        if (deviceType === 'ios') {
            const iosPushSent = await sendPushNotification(pushTokenIdentifier, message);
            if (!iosPushSent) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to send verification code via iOS push notification",
                });
            } else {
                return { status: 200, message: "Code sent to user" };
            }
        } else if (deviceType === 'android') {
            const androidPushSent = await sendPushNotification(pushTokenIdentifier, message);
            if (!androidPushSent) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to send verification code via Android push notification",
                });
            } else {
                return { status: 200, message: "Code sent to user" };
            }
        }
    } else if (method === 'whatsapp') {
        const whatsappSent = await sendWhatsApp(destination, message);
        if (!whatsappSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via WhatsApp",
            });
        } else {
            return { status: 200, message: "Code sent to user" };
        }
    } else if (method === 'webhook') {
        const webhookSent = await sendWebhook(destination, { message });
        if (!webhookSent) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification code via webhook",
            });
        } else {
            return { status: 200, message: "Code sent to user" };
        }
    }
}