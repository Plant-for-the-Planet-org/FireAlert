import {z} from 'zod';

export const createAlertMethodSchema = z.object({
    method: z.string({
        required_error: 'Method is required!'
    }),
    destination: z.string({
        required_error: 'Destination of alert method must be specified'
    }),
    isVerified: z.boolean(),
    deviceType: z.string(),
    isEnabled: z.boolean(),
    notificationToken: z.string(),
    userId: z.string(),
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
        method: z.string(),
        destination: z.string(),
        isVerified: z.boolean(),
        deviceType: z.string(),
        isEnabled: z.boolean(),
        notificationToken: z.string(),
        userId: z.string(),
    }).partial(),
})



