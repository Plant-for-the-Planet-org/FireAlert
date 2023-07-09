import { z } from "zod";

// Zod Schema for createGeoEvent
export const createGeoEventSchema = z.object({
    type: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    eventDate: z.date(),
    confidence: z.enum(["high","medium","low"]),
    radius: z.number().optional(),
    data: z.record(z.unknown()).optional(),
});
