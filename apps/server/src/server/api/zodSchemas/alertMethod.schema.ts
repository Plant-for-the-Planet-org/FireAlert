import { z } from 'zod';
import phone from 'phone'

export const createAlertMethodSchema = z.object({
    method: z.enum(["email", "sms", "device", "whatsapp", "webhook"]),
    destination: z.string({
        required_error: 'Destination of alert method must be specified'
    }),
    deviceName: z.string().optional(),
    deviceId: z.string().optional(),
}).refine((obj) => {
    if (obj.method === 'sms') {
        // Check if the destination is a valid phone number in E.164 format
        const { isValid } = phone(obj.destination)
        return isValid;
    }
    return true; // Return true for other methods
}, {
    message: 'Must be a valid phone number in E.164 format when the method is "sms"'
})

export const params = z.object({
    alertMethodId: z.string(),
})

export const verifySchema = z.object({
    params,
    body: z.object({
        token: z.string()
    })
})

export const updateAlertMethodSchema = z.object({
    params,
    body: z.object({
        isEnabled: z.boolean(),
    })
})

export type ParamsType = z.infer<typeof params>;
