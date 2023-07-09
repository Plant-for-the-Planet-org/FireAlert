import { z } from "zod";

// Zod Schema for createGeoEventProvider
export const createGeoEventProviderSchema = z.object({
    isActive: z.boolean().optional(),
    name: z.string(),
    description: z.string().optional(),
});

// Zod Schema for updateGeoEventProvider body
const UpdateGeoEventProviderBodySchema = z.object({
    isActive: z.boolean(),
    name: z.string(),
    description: z.string(),
}).partial();

// Zod Schema for updateGeoEventProvider params
export const geoEventProviderParamsSchema = z.object({
    id: z.string(),
});

// Zod Schema for updateGeoEventProvider
export const updateGeoEventProviderSchema = z.object({
    params: geoEventProviderParamsSchema,
    body: UpdateGeoEventProviderBodySchema,
});