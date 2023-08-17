import {z} from 'zod';

export const queryAlertSchema = z.object({
    id: z.string().cuid({ message: "Invalid CUID" }),
})

export const createAlertSchema = z.object({
    siteId: z.string(),
    type: z.enum(["fire"]),
    latitude: z.number(),
    longitude: z.number(),
    eventDate: z.date().optional(),
    detectedBy: z.string(),
    confidence: z.enum(["medium", "low", "high"]),
    distance: z.number().optional(),
    data: z.record(z.unknown()).optional(),
});



