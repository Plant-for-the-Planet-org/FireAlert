import {z} from 'zod';

export const createAlertSchema = z.object({
    type: z.string(),
    eventDate: z.date(),
    detectedBy: z.string(),
    confidence: z.number(),
    latitude: z.number(),
    longitude: z.number(),
    frp: z.number(),
    isRead: z.boolean(),
    siteId: z.string(),
})

export const params = z.object({
    alertId: z.string(),
})

export const updateAlertSchema = z.object({
    params,
    body: z.object({
        type: z.string(),
        eventDate: z.date(),
        detectedBy: z.string(),
        confidence: z.number(),
        latitude: z.number(),
        longitude: z.number(),
        frp: z.number(),
        isRead: z.boolean(),
        siteId: z.string(),
    }).partial(),
})




