import { z } from 'zod';
import phone from 'phone'

export const createAlertMethodSchema = z.object({
    method: z.enum(["email", "sms", "device", "whatsapp", "webhook"]),
    destination: z.string({
        required_error: 'Destination of alert method must be specified'
    }),
    isEnabled: z.boolean().optional(),
    deviceType: z.enum(["ios", "android"]).optional(),
}).refine((obj) => {
    if (obj.method === 'sms') {
        // Check if the destination is a valid phone number in E.164 format
        const {isValid} = phone(obj.destination)
        return isValid;
    }
    return true; // Return true for other methods
}, {
    message: 'Must be a valid phone number in E.164 format when the method is "sms"'
})

export const verifySchema = z.object({
    alertMethodId: z.string(),
    token: z.string()
})

export const params = z.object({
    alertMethodId: z.string(),
})

export const updateAlertMethodSchema = z.object({
    params,
    body: z.object({
        method: z.enum(["email", "sms", "device", "whatsapp", "webhook"]),
        destination: z.string(),
        isEnabled: z.boolean(),
        deviceType: z.enum(["ios", "android"]),
    }).partial().refine((obj) => {
        if (obj.method && obj.destination && obj.method === 'sms') {
            // Check if the destination is a valid phone number in E.164 format
            const {isValid} = phone(obj.destination)
            return isValid;
        }
        return true; // Return true for other methods
    }, {
        message: 'Must be a valid phone number in E.164 format when the method is "sms"'
    }),
})

export type ParamsType = z.infer<typeof params>;
