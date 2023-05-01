import { z } from 'zod';

export const createAlertMethodSchema = z.object({
    method: z.enum(["email", "sms", "device"]),
    destination: z.string({
        required_error: 'Destination of alert method must be specified'
    }),
    isVerified: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
    deviceType: z.enum(["ios", "android"]).optional(),
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



