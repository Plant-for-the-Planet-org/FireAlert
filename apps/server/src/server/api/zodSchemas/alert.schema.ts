import {z} from 'zod';
import validator from 'validator';

export const detectedBySchema = z.string().min(5, { message: "DetectedBy must be 5 or more characters long" }).max(100, { message: "DetectedBy be 100 or less characters long" }).refine(value => {
        const sanitized = validator.escape(value);
        return sanitized === value;
}, {
    message: 'DetectedBy contains invalid characters',
});

import validator from 'validator';

export const idSchema = z.string().min(1, { message: "ID must be 1 or more characters long" }).max(100, { message: "ID be 100 or less characters long" }).refine(value => {
        const sanitized = validator.escape(value);
        return sanitized === value;
}, {
    message: 'Invalid ID',
});

export const queryAlertSchema = z.object({
    id: idSchema,
})

export const createAlertSchema = z.object({
    siteId: z.string().cuid({ message: "Invalid CUID" }),
    type: z.enum(["fire"]),
    latitude: z.number(),
    longitude: z.number(),
    eventDate: z.date().optional(),
    detectedBy: detectedBySchema,
    confidence: z.enum(["medium", "low", "high"]),
    distance: z.number().optional(),
    // TODO: Do we need the data field here? This could lead to security vulnerabilities
    // data: z.record(z.unknown()).optional(),
});



