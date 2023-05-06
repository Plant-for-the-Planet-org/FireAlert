import { z } from 'zod';
import phone from 'phone'

export const createAlertMethodSchema = z.object({
    method: z.enum(["email", "sms", "device"]),
    destination: z.string({
        required_error: 'Destination of alert method must be specified'
    }),
    isVerified: z.boolean().optional(),
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

export const sendVerificationSchema = z.object({
    alertMethodId: z.string(),
    method: z.string(),
    destination: z.string(),
})

export const params = z.object({
    alertMethodId: z.string(),
})

export const updateAlertMethodSchema = z.object({
    params,
    body: z.object({
        method: z.enum(["email", "sms", "device"]),
        destination: z.string(),
        isVerified: z.boolean(),
        isEnabled: z.boolean(),
        deviceType: z.enum(["ios", "android"]),
    }).partial(),
})



