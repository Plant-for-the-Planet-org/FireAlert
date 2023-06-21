import { z } from "zod";

// Zod Schema for createGeoEvent
export const createGeoEventSchema = z.object({
    type: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    eventDate: z.date(),
    geometry: z.object({
        type: z.string(),
        coordinates: z.array(z.number()),
    }),
    confidence: z.number(),
    radius: z.number(),
    data: z.object({
        [z.string()]: z.any(),
    }),
});
