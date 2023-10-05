import { z } from 'zod';
import phone from 'phone'
import validator from 'validator';

export const createAlertMethodSchema = z.object({
    method: z.enum(["email", "sms", "device", "whatsapp", "webhook"]),
    destination: z.string({
        required_error: 'Destination of alert method must be specified'
    }).refine((value) => {
            const sanitized = validator.escape(value);
            return sanitized === value;
        }, {
            message: 'Contains invalid characters',
        }),
    deviceName: z.string().optional(),
    deviceId: z.string().optional(),
}).refine((obj) => {
    if (obj.method === 'sms') {
        // Check if the destination is a valid phone number in E.164 format
        const { isValid } = phone(obj.destination);
        return isValid;
    }
    if (obj.method === 'email') {
        return z.string().email().safeParse(obj.destination).success;
    }
    return true; // Return true for other methods
}, {
    message: 'Must be a valid phone number in E.164 format when the method is "sms"'
});

export const params = z.object({
    alertMethodId: z.string().cuid({ message: "Invalid CUID" }),
});

export const verifySchema = z.object({
    params,
    body: z.object({
        token: z.string().length(5, { message: "Invalid OTP" }).refine(value => {
            const sanitized = validator.escape(value);
            return sanitized === value;
        }, {
            message: 'OTP Contains invalid characters',
        })
    })
});

export const updateAlertMethodSchema = z.object({
    params,
    body: z.object({
        isEnabled: z.boolean(),
    })
});

export type ParamsType = z.infer<typeof params>;
